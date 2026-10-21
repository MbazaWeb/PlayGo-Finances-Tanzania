import {useCallback,useEffect,useState,type FormEvent} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import {Link,useSearchParams} from 'react-router-dom';

type Loan={id:string;principal_tzs:number;interest_tzs:number;outstanding_tzs:number;due_at:string;created_at:string;penalty_accrued_tzs:number;penalty_days:number};
type Repayment={id:string;loan_id:string;amount_tzs:number;method:string;created_at:string};
const money=(n:number)=>'TZS '+n.toLocaleString('en-TZ');
const fmt=(v:string)=>new Date(v).toLocaleString('en-TZ');
const dayMs=86400000;
function effectiveOutstanding(loan:Loan){
 const days=Math.max(0,Math.ceil((Date.now()-new Date(loan.due_at).getTime())/dayMs));
 const additional=Math.max(0,days-Number(loan.penalty_days||0))*Math.ceil((Number(loan.principal_tzs)+Number(loan.interest_tzs))*0.005);
 return Number(loan.outstanding_tzs)+additional;
}

const creditTiers=[
 {name:'Starter',min:0,limit:20000},
 {name:'Bronze',min:100,limit:40000},
 {name:'Silver',min:200,limit:75000},
 {name:'Gold',min:350,limit:100000},
 {name:'Platinum',min:500,limit:200000},
 {name:'Diamond',min:700,limit:300000},
] as const;
type CreditEligibility={score:number;tier:string;max_loan_tzs:number;available_tzs:number;active_outstanding_tzs:number;next_tier:string|null;next_tier_score:number|null};
type CreditEvent={event_type:string;event_key:string;points:number};
function CreditScoreDashboard({credit,events,loading}:{credit:CreditEligibility|null;events:CreditEvent[];loading:boolean}){
 const score=Number(credit?.score||0);
 const tier=creditTiers.find(t=>t.name===credit?.tier)||creditTiers[0];
 const next=creditTiers.find(t=>t.name===credit?.next_tier);
 const progress=next?Math.min(100,Math.max(0,(score-tier.min)/(next.min-tier.min)*100)):100;
 const transactions=events.filter(e=>e.event_type==='transaction').length;
 const onTime=events.filter(e=>e.event_type==='repayment'&&e.points>=10).length;
 const late=events.filter(e=>e.event_type==='repayment'&&e.points===3).length;
 const overdue=events.filter(e=>e.event_type==='overdue').length;
 return <section aria-label="Credit score and loan eligibility" style={{marginTop:28,padding:18,border:'1px solid #444',borderRadius:18}}>
  <h2>Credit Score & Loan Eligibility</h2>
  {loading&&!credit?<p role="status">Loading credit activity…</p>:!credit?<p>Credit information is currently unavailable.</p>:<>
   <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,flexWrap:'wrap'}}>
    <div><small>YOUR CREDIT SCORE</small><div style={{fontSize:36,fontWeight:750}}>{score}</div><strong>points · {tier.name} Level</strong></div>
    <div style={{textAlign:'right'}}><small>Borrowing limit</small><div style={{fontSize:25,fontWeight:700}}>{money(Number(credit.max_loan_tzs))}</div></div>
   </div>
   <div role="progressbar" aria-label="Progress to next credit level" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} style={{height:12,background:'#333',borderRadius:20,overflow:'hidden',marginTop:20}}><div style={{width:progress+'%',height:'100%',background:'#278761',borderRadius:20}}/></div>
   <p>{next?`${Math.max(0,next.min-score)} more points to qualify for ${next.name} (up to ${money(next.limit)}), subject to full on-time loan repayment.`:'You have reached the highest credit tier.'}</p>
   <hr style={{border:0,borderTop:'1px solid #444',margin:'22px 0'}}/>
   {([{label:'Eligible transactions',value:transactions},{label:'Loans fully repaid on time',value:onTime},{label:'Late repayments',value:late},{label:'Overdue penalty events',value:overdue}]).map(item=><p key={item.label} style={{display:'flex',justifyContent:'space-between',gap:16}}><strong>{item.label}</strong><strong>{item.value}</strong></p>)}
   <p style={{fontSize:12,opacity:.7}}>Metrics update automatically from recorded account activity. Credit limits unlock only after eligible full on-time repayment. No manual score adjustments.</p>
  </>}
 </section>;
}

export function SecureQuickLoan({supabase,userId}:{supabase:SupabaseClient;userId:string}){
 const [searchParams]=useSearchParams();
 const view=searchParams.get('view')||'overview';
 const [loans,setLoans]=useState<Loan[]>([]);
 const [credit,setCredit]=useState<CreditEligibility|null>(null);
 const [creditEvents,setCreditEvents]=useState<CreditEvent[]>([]);
 const [repayments,setRepayments]=useState<Repayment[]>([]);
 const [balance,setBalance]=useState<number|null>(null);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [busy,setBusy]=useState(false);
 const [borrow,setBorrow]=useState('');
 const [term,setTerm]=useState('30');
 const [repayAmount,setRepayAmount]=useState('');
 const [selected,setSelected]=useState('');
 const load=useCallback(async()=>{
  const [l,r,w,eligibility,events]=await Promise.all([
   supabase.from('pg_quick_loan_balances').select('id,principal_tzs,interest_tzs,outstanding_tzs,due_at,created_at,penalty_accrued_tzs,penalty_days').eq('user_id',userId).order('created_at',{ascending:false}),
   supabase.from('pg_loan_repayments').select('id,loan_id,amount_tzs,method,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(100),
   supabase.from('pg_demo_wallets').select('balance_tzs').eq('user_id',userId).maybeSingle(),
   supabase.rpc('pg_credit_eligibility'),
   supabase.from('pg_credit_score_events').select('event_type,event_key,points').eq('user_id',userId).order('created_at',{ascending:false}).limit(10000)
  ]);
  if(l.error||r.error||w.error)setError(l.error?.message||r.error?.message||w.error?.message||'Unable to load loans');
  else{setError('');setLoans((l.data||[]) as Loan[]);setRepayments((r.data||[]) as Repayment[]);setBalance(Number(w.data?.balance_tzs||0));}
  if(!eligibility.error&&eligibility.data){const value=Array.isArray(eligibility.data)?eligibility.data[0]:eligibility.data;setCredit(value as CreditEligibility);}
  if(!events.error)setCreditEvents((events.data||[]) as CreditEvent[]);
  setLoading(false);
 },[supabase,userId]);
 useEffect(()=>{void load();window.addEventListener('playgo:wallet-updated',load);return()=>window.removeEventListener('playgo:wallet-updated',load);},[load]);
 const active=loans.filter(l=>Number(l.outstanding_tzs)>0);
 const current=active.find(l=>l.id===selected)||active[0];
 const total=current?effectiveOutstanding(current):0;
 const base=Number(borrow);
 const days=Number(term);
 const rate=days===1?2:days===3?2.5:days===7?3:days===14?4:5;
 const maxLoan=credit?Number(credit.max_loan_tzs):0;
 const valid=Number.isSafeInteger(base)&&base>=5000&&base<=maxLoan;
 const interest=valid?Math.round(base*rate/100):0;
 async function request(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!valid||busy||active.length)return;
  setBusy(true);setNotice('');setError('');
  const res=await supabase.rpc('pg_issue_demo_quick_loan',{p_id:crypto.randomUUID(),p_amount:base,p_term_days:days});
  setBusy(false);
  if(res.error){setError(res.error.message);return;}
  setNotice('Loan '+res.data+' approved and credited to your PlayGo wallet. This is not a real disbursement.');
  setBorrow('');await load();window.dispatchEvent(new Event('playgo:wallet-updated'));
 }
 async function pay(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!current||busy)return;
  const n=Number(repayAmount);
  if(!Number.isSafeInteger(n)||n<1||n>5000000){setError('Enter a valid whole-number repayment amount.');return;}
  if(balance===null||balance<=0){setError('Insufficient wallet balance.');return;}
  setBusy(true);setError('');setNotice('');
  const res=await supabase.rpc('pg_repay_demo_loan',{p_loan_id:current.id,p_amount:n,p_id:crypto.randomUUID()});
  setBusy(false);
  if(res.error){setError(res.error.message);return;}
  setNotice('Manual repayment recorded: '+money(Number(res.data))+'.');
  setRepayAmount('');await load();window.dispatchEvent(new Event('playgo:wallet-updated'));
 }
 return <section className="pg-feature-card">
  {loading&&<p role="status">Loading loan records…</p>}
  {error&&<p className="pg-error" role="alert">{error}</p>}
  {notice&&<p role="status">{notice}</p>}
  {view!=='overview'&&<Link to="/quick-loan" className="pg-back">← Back to Quick Loan</Link>}
  {view==='overview'&&<>
  <h1>Personal Boost Loan</h1>
  <div className="pg-details"><p><strong>Available Wallet</strong><span>{balance===null?'Loading…':money(balance)}</span></p><p><strong>Active loan balance</strong><span>{money(active.reduce((sum,l)=>sum+effectiveOutstanding(l),0))}</span></p></div>
  <div style={{display:'grid',gap:12,marginTop:24}}>
  {current?<Link className="pg-feature-card" to="/quick-loan?view=active"><strong>Active Loan →</strong><p>View balance, due date and repayment options</p></Link>:<Link className="pg-feature-card" to="/quick-loan?view=request"><strong>Request Loan →</strong><p>Check your borrowing limit and request a loan</p></Link>}
  <Link className="pg-feature-card" to="/quick-loan?view=credit"><strong>Credit Score & Eligibility →</strong><p>Points, activity and borrowing tier</p></Link>
  <Link className="pg-feature-card" to="/quick-loan?view=loans"><strong>Loan History →</strong><p>View previous and active loans</p></Link>
  <Link className="pg-feature-card" to="/quick-loan?view=repayments"><strong>Repayment History →</strong><p>Review completed repayments</p></Link>
  </div>
  </>}
  {view==='active'&&<>
  <h1>Loan Details & Repayment</h1>
  {current&&<section aria-label="Active loan details">
   <h2>Active Loan</h2>
   {active.length>1&&<><label htmlFor="repay-select">Select loan</label><select id="repay-select" value={current.id} onChange={e=>setSelected(e.target.value)}>{active.map(l=><option key={l.id} value={l.id}>{l.id}</option>)}</select></>}
   <div className="pg-details">
    <p><strong>Loan reference</strong><span>{current.id}</span></p>
    <p><strong>Principal</strong><span>{money(Number(current.principal_tzs))}</span></p>
    <p><strong>Interest</strong><span>{money(Number(current.interest_tzs))}</span></p>
    <p><strong>Due date</strong><span>{fmt(current.due_at)}</span></p>
    <p><strong>Accrued late penalty</strong><span>{money(Number(current.penalty_accrued_tzs)+Math.max(0,total-Number(current.outstanding_tzs)))}</span></p>
    <p><strong>Outstanding balance</strong><span>{money(total)}</span></p>
    <p><strong>Status</strong><span>{Date.now()>new Date(current.due_at).getTime()?'Overdue — automatic collection active':'Active — not due yet'}</span></p>
   </div>
   <p className="pg-note">{Date.now()>new Date(current.due_at).getTime()?'Outstanding amounts may be collected automatically when funds become available.':'Automatic repayment is scheduled for the due date. Early repayment is optional.'}</p>
   <details style={{marginTop:18,border:'1px solid #e5e7eb',borderRadius:14,padding:'14px 16px'}}>
    <summary style={{cursor:'pointer',fontWeight:700}}>Make an early or additional repayment (optional)</summary>
    <form className="pg-form" onSubmit={pay} style={{marginTop:16}}>
     <label htmlFor="repay-amount">Repayment amount (TZS)</label>
     <input id="repay-amount" type="number" min="1" max={Math.max(1,Math.floor(total))} step="1" required value={repayAmount} onChange={e=>setRepayAmount(e.target.value)} placeholder="Amount in TZS"/>
     <p className="pg-note">Available wallet: {balance===null?'Loading…':money(balance)}. Maximum outstanding: {money(total)}.</p>
     <button className="pg-button" type="submit" disabled={busy||!repayAmount||balance===null||balance<=0}>{busy?'Processing…':'Confirm Repayment'}</button>
    </form>
   </details>
  </section>}
  </>}
  {view==='request'&&<>
  <h1>Request Loan</h1>
  {!active.length&&!loading&&<>
   <form className="pg-form" onSubmit={request}>
    <label htmlFor="loan-amount">Amount (TZS)</label><input id="loan-amount" type="number" min="5000" max={maxLoan} step="1000" required value={borrow} onChange={e=>setBorrow(e.target.value)} placeholder={credit?`5,000 – ${maxLoan.toLocaleString("en-TZ")}`:"Loading loan limit…"}/>
    <label htmlFor="loan-term">Repayment term</label><select id="loan-term" value={term} onChange={e=>setTerm(e.target.value)}><option value="1">24 hours · 2%</option><option value="3">3 days · 2.5%</option><option value="7">7 days · 3%</option><option value="14">14 days · 4%</option><option value="30">30 days · 5%</option></select>


    <button className="pg-button" type="submit" disabled={busy||!valid}>{busy?'Processing…':'Request Loan'}</button>
   </form></>}
  </>}
  {view==='credit'&&<>
  <h1>Credit Score</h1>
  <CreditScoreDashboard credit={credit} events={creditEvents} loading={loading}/>
  </>}
  {view==='loans'&&<>
  <h1>Loan History</h1>
  
  {!loans.length&&!loading&&<p>No loans recorded yet.</p>}
  {loans.map(l=><div key={l.id} className="pg-tx"><div><strong>{l.id}</strong><small> · Due {fmt(l.due_at)}</small></div><span>{Number(l.outstanding_tzs)===0?'Paid in full':money(effectiveOutstanding(l))+' remaining'}</span></div>)}
  </>}
  {view==='repayments'&&<>
  <h1>Repayment History</h1>
  
  {!repayments.length&&!loading&&<p>No repayments recorded yet.</p>}
  {repayments.map(p=><div key={p.id} className="pg-tx"><div><strong>{p.method==='automatic'?'Automatic deduction':'Manual repayment'}</strong><small> · {fmt(p.created_at)} · {p.loan_id}</small></div><span>{money(Number(p.amount_tzs))}</span></div>)}
  </>}
 </section>;
}
