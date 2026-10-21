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
  <h2>Loan History</h2>
  {!loans.length&&!loading&&<p>No loans recorded yet.</p>}
  {loans.map(l=><div key={l.id} className="pg-tx"><div><strong>{l.id}</strong><small> · Due {fmt(l.due_at)}</small></div><span>{Number(l.outstanding_tzs)===0?'Paid in full':money(effectiveOutstanding(l))+' remaining'}</span></div>)}
  <h2>Repayment History</h2>
  {!repayments.length&&!loading&&<p>No repayments recorded yet.</p>}
  {repayments.map(p=><div key={p.id} className="pg-tx"><div><strong>{p.method==='automatic'?'Automatic deduction':'Manual repayment'}</strong><small> · {fmt(p.created_at)} · {p.loan_id}</small></div><span>{money(Number(p.amount_tzs))}</span></div>)}
 </section>;
}
