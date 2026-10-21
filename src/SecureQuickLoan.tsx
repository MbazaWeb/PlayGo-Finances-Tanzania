import {useCallback,useEffect,useState,type FormEvent} from 'react';
import {Link} from 'react-router-dom';
import type {SupabaseClient} from '@supabase/supabase-js';

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
function CreditScoreSimulator(){
 const [transactions,setTransactions]=useState(15);
 const [onTime,setOnTime]=useState(2);
 const [late,setLate]=useState(0);
 // Preview only: these controls never write to the database or affect borrowing eligibility.
 const score=Math.max(0,transactions*2+onTime*15-late*20+70);
 const index=creditTiers.reduce((result,tier,i)=>score>=tier.min?i:result,0);
 const tier=creditTiers[index];
 const next=creditTiers[index+1];
 const progress=next?Math.min(100,Math.max(0,(score-tier.min)/(next.min-tier.min)*100)):100;
 return <section aria-label="Interactive credit score simulator" style={{marginTop:28,padding:18,border:'1px solid #444',borderRadius:18}}>
  <h2>Interactive Credit Score Simulator</h2>
  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,flexWrap:'wrap'}}>
   <div><small>SIMULATED CREDIT SCORE</small><div style={{fontSize:36,fontWeight:750}}>{score}</div><strong>points · {tier.name} Level</strong></div>
   <div style={{textAlign:'right'}}><small>Borrowing limit</small><div style={{fontSize:25,fontWeight:700}}>{money(tier.limit)}</div></div>
  </div>
  <div role="progressbar" aria-label="Progress to next credit level" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} style={{height:12,background:'#333',borderRadius:20,overflow:'hidden',marginTop:20}}>
   <div style={{width:progress+'%',height:'100%',background:'#278761',borderRadius:20}}/>
  </div>
  <p>{next?`${Math.max(0,next.min-score)} more points to reach ${next.name} and unlock up to ${money(next.limit)}.`:'Highest credit level reached.'}</p>
  <hr style={{border:0,borderTop:'1px solid #444',margin:'22px 0'}}/>
  {([
   {label:'Eligible transactions',value:transactions,set:setTransactions,max:100},
   {label:'Loans fully repaid on time',value:onTime,set:setOnTime,max:20},
   {label:'Late repayments',value:late,set:setLate,max:20},
  ]).map(item=><div key={item.label} style={{marginBottom:20}}>
   <label style={{display:'flex',justifyContent:'space-between',fontWeight:600,gap:12}}><span>{item.label}</span><span>{item.value}</span></label>
   <input aria-label={item.label} type="range" min="0" max={item.max} step="1" value={item.value} onChange={e=>item.set(Number(e.target.value))} style={{width:'100%',accentColor:'#278761'}}/>
  </div>)}
  <button type="button" onClick={()=>{setTransactions(15);setOnTime(2);setLate(0);}} style={{width:'100%',borderRadius:24,padding:12,border:'1px solid #777',background:'transparent',color:'inherit',cursor:'pointer'}}>Reset simulation</button>
  <p style={{fontSize:12,opacity:.7}}>Illustrative calculation only. Actual points, eligibility and borrowing limits are determined by your account records. Monthly bonuses, overdue-day deductions and anti-abuse controls are not included here.</p>
 </section>;
}

export function SecureQuickLoan({supabase,userId}:{supabase:SupabaseClient;userId:string}){
 const [loans,setLoans]=useState<Loan[]>([]);
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
  const [l,r,w]=await Promise.all([
   supabase.from('pg_quick_loan_balances').select('id,principal_tzs,interest_tzs,outstanding_tzs,due_at,created_at,penalty_accrued_tzs,penalty_days').eq('user_id',userId).order('created_at',{ascending:false}),
   supabase.from('pg_loan_repayments').select('id,loan_id,amount_tzs,method,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(100),
   supabase.from('pg_demo_wallets').select('balance_tzs').eq('user_id',userId).maybeSingle()
  ]);
  if(l.error||r.error||w.error)setError(l.error?.message||r.error?.message||w.error?.message||'Unable to load loans');
  else{setError('');setLoans((l.data||[]) as Loan[]);setRepayments((r.data||[]) as Repayment[]);setBalance(Number(w.data?.balance_tzs||0));}
  setLoading(false);
 },[supabase,userId]);
 useEffect(()=>{void load();window.addEventListener('playgo:wallet-updated',load);return()=>window.removeEventListener('playgo:wallet-updated',load);},[load]);
 const active=loans.filter(l=>Number(l.outstanding_tzs)>0);
 const current=active.find(l=>l.id===selected)||active[0];
 const total=current?effectiveOutstanding(current):0;
 const base=Number(borrow);
 const days=Number(term);
 const rate=days===1?2:days===3?2.5:days===7?3:days===14?4:5;
 const valid=Number.isSafeInteger(base)&&base>=5000&&base<=20000;
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
  <Link className="pg-back" to="/dashboard">← Back to Home</Link>
  <h1>Personal Boost Loan</h1>
  {loading&&<p role="status">Loading loan records…</p>}
  {error&&<p className="pg-error" role="alert">{error}</p>}
  {notice&&<p role="status">{notice}</p>}
  <div className="pg-details"><p><strong>Available Wallet</strong><span>{balance===null?'Loading…':money(balance)}</span></p><p><strong>Active loan balance</strong><span>{money(active.reduce((sum,l)=>sum+effectiveOutstanding(l),0))}</span></p></div>
  {current&&<><h2>Repay Loan</h2>
   <label htmlFor="repay-select">Loan</label>
   <select id="repay-select" value={current.id} onChange={e=>setSelected(e.target.value)}>{active.map(l=><option key={l.id} value={l.id}>{l.id}</option>)}</select>
   <div className="pg-details">
    <p><strong>Principal</strong><span>{money(Number(current.principal_tzs))}</span></p>
    <p><strong>Interest</strong><span>{money(Number(current.interest_tzs))}</span></p>
    <p><strong>Due date</strong><span>{fmt(current.due_at)}</span></p>
    <p><strong>Accrued late penalty</strong><span>{money(Number(current.penalty_accrued_tzs)+Math.max(0,total-Number(current.outstanding_tzs)))}</span></p>
    <p><strong>Current outstanding (including penalty)</strong><span>{money(total)}</span></p>
    <p><strong>Status</strong><span>{Date.now()>new Date(current.due_at).getTime()?'Overdue — auto collection active':'Not due yet'}</span></p>
   </div>
   <form className="pg-form" onSubmit={pay}>
    <label htmlFor="repay-amount">Manual repayment amount (TZS)</label>
    <input id="repay-amount" type="number" min="1" max="5000000" step="1" required value={repayAmount} onChange={e=>setRepayAmount(e.target.value)} placeholder="Enter amount to repay"/>
    <button className="pg-button" type="button" onClick={()=>setRepayAmount(String(Math.min(total,balance??0)))} disabled={!balance||busy}>Pay Available / Full</button>
    <button className="pg-button" type="submit" disabled={busy||!repayAmount}>{busy?'Processing…':'Pay Loan Manually'}</button>
   </form></>}
  {!active.length&&!loading&&<><h2>Request Loan</h2>
   <form className="pg-form" onSubmit={request}>
    <label htmlFor="loan-amount">Amount (TZS)</label><input id="loan-amount" type="number" min="5000" max="20000" step="1000" required value={borrow} onChange={e=>setBorrow(e.target.value)} placeholder="5,000 – 20,000"/>
    <label htmlFor="loan-term">Repayment term</label><select id="loan-term" value={term} onChange={e=>setTerm(e.target.value)}><option value="1">24 hours · 2%</option><option value="3">3 days · 2.5%</option><option value="7">7 days · 3%</option><option value="14">14 days · 4%</option><option value="30">30 days · 5%</option></select>


    <button className="pg-button" type="submit" disabled={busy||!valid}>{busy?'Processing…':'Request Loan'}</button>
   </form></>}
  <CreditScoreSimulator/>
  <h2>Loan History</h2>
  {!loans.length&&!loading&&<p>No loans recorded yet.</p>}
  {loans.map(l=><div key={l.id} className="pg-tx"><div><strong>{l.id}</strong><small> · Due {fmt(l.due_at)}</small></div><span>{Number(l.outstanding_tzs)===0?'Paid in full':money(effectiveOutstanding(l))+' remaining'}</span></div>)}
  <h2>Repayment History</h2>
  {!repayments.length&&!loading&&<p>No repayments recorded yet.</p>}
  {repayments.map(p=><div key={p.id} className="pg-tx"><div><strong>{p.method==='automatic'?'Automatic deduction':'Manual repayment'}</strong><small> · {fmt(p.created_at)} · {p.loan_id}</small></div><span>{money(Number(p.amount_tzs))}</span></div>)}
 </section>;
}
