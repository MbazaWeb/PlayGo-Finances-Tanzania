import { downloadAccountStatementPdf, type StatementTransaction } from './StatementPdf';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { walletInfo, creditApprovedDemoLoan } from './Wallet';

const options = ['Fee payment inquiry','Transaction inquiry','Account assistance','Other student finance inquiry'];
export function GovernmentStudentLoan(){
 return <section className="pg-feature-card" id="government-loan">
 <div className="pg-services-heading"><h2>Government Student Loan</h2><span>HESLB · Status only</span></div>
 
 <div className="pg-details">
 <p><strong>Government provider</strong><span>HESLB</span></p>
 <p><strong>Allocation status</strong><span>Not connected · Unknown</span></p>
 <p><strong>Allocated amount</strong><span>Not available</span></p>
 <p><strong>Disbursement status</strong><span>Not available</span></p>
 </div>
 
 </section>;
}
type QuickLoanRequest={id:string;account:string;amount:number;termDays:number;reason:string;interestRate?:number;interestAmount?:number;totalRepayment?:number;createdAt:string;status:'Not approved'|'Checking'|'Approved'};
const QUICK_KEY='playgo.demo.quick-loan.v1';
function getQuickLoans():QuickLoanRequest[]{try{const x:unknown=JSON.parse(localStorage.getItem(QUICK_KEY)||'[]');return Array.isArray(x)?(x as QuickLoanRequest[]).map(loan=>({...loan,status:/approved/i.test(loan.status)?'Approved':/checking/i.test(loan.status)?'Checking':'Not approved'})):[];}catch{return [];}}
export function HomeLoanStatus({account}:{account:string}){
 const [now,setNow]=useState(()=>Date.now());
 const [requests,setRequests]=useState<QuickLoanRequest[]>(()=>getQuickLoans().filter(x=>x.account===account));
 useEffect(()=>{const tick=()=>{const time=Date.now();setNow(time);const all=getQuickLoans();let changed=false;const updated=all.map(x=>{if(x.account!==account||x.status!=='Checking'||time-new Date(x.createdAt).getTime()<120000)return x;changed=true;return {...x,status:'Approved' as const};});if(changed){try{localStorage.setItem(QUICK_KEY,JSON.stringify(updated));}catch{}}updated.filter(x=>x.account===account&&x.status==='Approved').forEach(x=>{try{creditApprovedDemoLoan(account,x);}catch{}});setRequests(updated.filter(x=>x.account===account));};tick();const timer=window.setInterval(tick,1000);return()=>window.clearInterval(timer);},[account]);
 const ordered=requests.slice().sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
 const active=ordered.find(x=>x.status==='Checking');
 const money=(n:number)=>'TZS '+n.toLocaleString('en-TZ');
 const elapsed=active?Math.max(0,now-new Date(active.createdAt).getTime()):0;
 const remaining=Math.max(0,Math.ceil((120000-elapsed)/1000));
 const progress=Math.min(100,Math.floor(elapsed/120000*100));
 const stage=progress<25?'Checking request details':progress<50?'Validating student profile':progress<75?'Reviewing amount and repayment term':progress<100?'Preparing decision':'Completing check';
 return <div className="pg-feature-card" style={{marginTop:16}}><div className="pg-services-heading"><h2>Personal Boost Loan</h2></div>
 {active?<div aria-live="polite"><p><strong>Loan check in progress</strong> · {active.id}</p><p>Requested: {money(active.amount)} · {active.termDays} days</p><p>{stage}</p><p><strong>Time remaining: {String(Math.floor(remaining/60)).padStart(2,'0')}:{String(remaining%60).padStart(2,'0')}</strong> · {progress}%</p><div className="pg-progress" role="progressbar" aria-label="Loan check progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div style={{width:progress+'%'}}/></div></div>:<p>{ordered.length?'Latest loan request status: '+ordered[0].status:'Wallet running low? Request emergency student funding.'}</p>}
 <Link className="pg-button" to={active?'/quick-loan?request='+encodeURIComponent(active.id):'/quick-loan'}>{active?'View Loan Check →':'⚡ Request Personal Boost →'}</Link>
 <h3>Loan Request History</h3>{ordered.length===0?<p className="pg-note">No loan requests yet.</p>:ordered.slice(0,4).map(x=><div className="pg-tx" key={x.id}><div><Link to={'/quick-loan?request='+encodeURIComponent(x.id)}><b>{x.id}</b></Link><small>{new Date(x.createdAt).toLocaleString('en-TZ')} · {x.termDays===1?'24 hours':x.termDays+' days'}</small><small>{x.status}</small></div><strong>{money(x.amount)}</strong></div>)}
 {ordered.length>4&&<Link to="/quick-loan" state={{from:"/services"}}>View all loan requests →</Link>}
 </div>;
}
export function QuickLoan({account}:{account:string}){
 const [searchParams]=useSearchParams();const selectedRequest=searchParams.get('request');
 const [amount,setAmount]=useState('');const [term,setTerm]=useState('30');const [reason,setReason]=useState('Emergency student expenses');
 const [message,setMessage]=useState('');const [requests,setRequests]=useState(()=>getQuickLoans().filter(x=>x.account===account));
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const tick=()=>{const time=Date.now();setNow(time);const all=getQuickLoans();let changed=false;const updated=all.map(x=>{if(x.account!==account||x.status!=='Checking'||time-new Date(x.createdAt).getTime()<120000)return x;changed=true;return {...x,status:'Approved' as const};});if(changed){localStorage.setItem(QUICK_KEY,JSON.stringify(updated));setRequests(updated.filter(x=>x.account===account));}updated.filter(x=>x.account===account&&x.status==='Approved').forEach(x=>{try{creditApprovedDemoLoan(account,x);}catch{}});};tick();const timer=window.setInterval(tick,1000);return()=>window.clearInterval(timer);},[account]);
 useEffect(()=>{if(!selectedRequest)return;const target=document.getElementById('loan-request-'+selectedRequest);target?.scrollIntoView({behavior:'smooth',block:'start'});},[selectedRequest,requests.length]);
 const principal=Number(amount);const interestRate=term==='1'?2:term==='3'?2.5:term==='7'?3:term==='14'?4:5;const validPreview=Number.isSafeInteger(principal)&&principal>=5000&&principal<=500000;const interestAmount=validPreview?Math.round(principal*interestRate/100):0;const totalRepayment=validPreview?principal+interestAmount:0;
 function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const n=Number(amount),days=Number(term);setMessage('');
 if(!Number.isSafeInteger(n)||n<5000||n>500000){setMessage('Amount must be TZS 5,000–500,000.');return;}
 if(![1,3,7,14,30].includes(days)){setMessage('Choose a valid period.');return;}
 
 const request:QuickLoanRequest={id:'QL-'+crypto.randomUUID().slice(0,8).toUpperCase(),account,amount:n,termDays:days,reason,interestRate,interestAmount,totalRepayment,createdAt:new Date().toISOString(),status:'Checking'};
 try{const all=[...getQuickLoans(),request];localStorage.setItem(QUICK_KEY,JSON.stringify(all));setRequests(all.filter(x=>x.account===account));setAmount('');setMessage('Loan check started. You will see the result in approximately 2 minutes.');}catch{setMessage('Could not save request.');}}
 if(selectedRequest){
 const selected=requests.find(x=>x.id===selectedRequest);
 const elapsed=selected?Math.max(0,now-new Date(selected.createdAt).getTime()):0;
 const remaining=Math.max(0,Math.ceil((120000-elapsed)/1000));
 const progress=Math.min(100,Math.floor(elapsed/120000*100));
 const stage=progress<25?'Checking request details':progress<50?'Validating student profile':progress<75?'Reviewing requested amount and term':progress<100?'Preparing decision':'Check complete';
 const dueAt=selected?new Date(selected.createdAt).getTime()+120000+selected.termDays*86400000:0;
 const baseRepayment=selected?(selected.totalRepayment??selected.amount):0;
 const overdueDays=selected&&selected.status==='Approved'&&now>dueAt?Math.ceil((now-dueAt)/86400000):0;
 const dailyPenalty=baseRepayment*0.005;
 const accruedPenalty=Math.round(dailyPenalty*overdueDays*100)/100;
 const amountDue=baseRepayment+accruedPenalty;
 const formatTZS=(value:number)=>'TZS '+value.toLocaleString('en-TZ',{minimumFractionDigits:value%1?2:0,maximumFractionDigits:2});

 return <section className="pg-feature-card" aria-label="Selected loan status"><Link className="pg-back" to="/dashboard">← Back to Home</Link><h2>Loan Status</h2>
 {!selected?<><p className="pg-error">This loan request was not found for your account.</p><Link to="/quick-loan" state={{from:"/services"}}>View loan requests →</Link></>:<>
 <div className="pg-details"><p><strong>Reference</strong><span>{selected.id}</span></p><p><strong>Amount requested</strong><span>TZS {selected.amount.toLocaleString('en-TZ')}</span></p><p><strong>Application date</strong><span>{new Date(selected.createdAt).toLocaleString('en-TZ')}</span></p><p><strong>Repayment term</strong><span>{selected.termDays===1?'24 hours':selected.termDays+' days'}</span></p><p><strong>Interest</strong><span>{selected.interestRate??0}%</span></p><p><strong>Repayment due date</strong><span>{new Date(dueAt).toLocaleString('en-TZ')}</span></p><p><strong>Original repayment</strong><span>{formatTZS(baseRepayment)}</span></p><p><strong>Late penalty rate</strong><span>0.5% per overdue day (simple)</span></p><p><strong>Daily penalty</strong><span>{formatTZS(dailyPenalty)}</span></p><p><strong>Days overdue</strong><span>{overdueDays}</span></p><p><strong>Accrued penalty</strong><span>{formatTZS(accruedPenalty)}</span></p><p><strong>Total repayment due</strong><span><b>{formatTZS(amountDue)}</b></span></p><p><strong>Status</strong><span>{overdueDays>0?'Overdue':selected.status}</span></p></div>
 {selected.status==='Checking'&&<div aria-live="polite"><h3>Loan Check</h3><p>{stage}</p><p><strong>Time remaining: {String(Math.floor(remaining/60)).padStart(2,'0')}:{String(remaining%60).padStart(2,'0')}</strong> · {progress}%</p><div className="pg-progress" role="progressbar" aria-label="Loan check progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div style={{width:progress+'%'}}/></div></div>}
 <p className="pg-note">Penalty begins only after the due date passes and continues to accrue for each started overdue day until repayment is recorded. Calculated at 0.5% per overdue day on original repayment, without compounding. </p><Link to="/quick-loan" state={{from:"/services"}}>All Loan Requests →</Link></>}
 </section>;
 }
 return <section className="pg-feature-card" id="quick-loan">
 <div className="pg-services-heading"><h2>Personal Boost Loan</h2></div>
 
 <div className="pg-details"><p><strong>Available to borrow</strong><span>TZS 5,000–500,000</span></p></div>
 <form className="pg-form" onSubmit={submit}>
 <label htmlFor="quick-amount">Amount requested (TZS)</label><input id="quick-amount" type="number" inputMode="numeric" min={5000} max={500000} step={1000} value={amount} onChange={e=>setAmount(e.target.value)} placeholder="e.g. 20000" required/>
 <label htmlFor="quick-term">Preferred repayment period</label><select id="quick-term" value={term} onChange={e=>setTerm(e.target.value)}><option value="1">24 hours</option><option value="3">3 days</option><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select>
 
 <label htmlFor="quick-reason">Purpose</label><select id="quick-reason" value={reason} onChange={e=>setReason(e.target.value)}><option>Emergency student expenses</option><option>Books and materials</option><option>Meals and transport</option><option>Temporary wallet shortfall</option></select>
 <div className="pg-details" aria-live="polite"><p><strong>Requested principal</strong><span>{validPreview?`TZS ${principal.toLocaleString("en-TZ")}`:"Enter an amount"}</span></p><p><strong>Interest ({interestRate}%)</strong><span>TZS {interestAmount.toLocaleString("en-TZ")}</span></p><p><strong>Total amount to pay (principal + interest)</strong><span><b>TZS {totalRepayment.toLocaleString("en-TZ")}</b></span></p><p><strong>Repayment period</strong><span>{term==='1'?'24 hours':term+' days'}</span></p></div>
 <div className="pg-feature-card" aria-live="polite" style={{background:"#eef6ff",border:"1px solid #b9d7fa",padding:16,marginTop:12,marginBottom:12}}><strong style={{display:"block",color:"#163b66"}}>TOTAL TO REPAY</strong><strong style={{display:"block",fontSize:"1.65rem",marginTop:6,color:"#163b66"}}>{validPreview?`TZS ${totalRepayment.toLocaleString("en-TZ")}`:"Enter a loan amount"}</strong><small style={{display:"block",marginTop:5,color:"#163b66"}}>{validPreview?`Loan TZS ${principal.toLocaleString("en-TZ")} + interest TZS ${interestAmount.toLocaleString("en-TZ")} (${interestRate}%) · ${term==='1'?'24 hours':term+' days'}`:"Principal plus automatically calculated interest"}</small></div>
 
 <button className="pg-button" type="submit" disabled={requests.some(x=>x.status==='Checking')}>Start Loan Check</button></form>
 {message&&<p className="pg-services-message" role="status">{message}</p>}
 <h3>My Quick Loan Requests</h3>{requests.length===0?<p className="pg-note">No requests yet.</p>:requests.slice().reverse().map(x=><div id={"loan-request-"+x.id} key={x.id} className="pg-service-request" style={selectedRequest===x.id?{outline:"2px solid #2474d2",outlineOffset:3,scrollMarginTop:20}: {scrollMarginTop:20}}><strong>TZS {x.amount.toLocaleString('en-TZ')}</strong><small>{x.id} · {new Date(x.createdAt).toLocaleDateString('en-TZ')}</small><p>{x.termDays} days · {x.reason}</p>{x.interestRate!=null&&x.totalRepayment!=null&&<p>Interest: {x.interestRate}% · Total repayment: TZS {x.totalRepayment.toLocaleString("en-TZ")}</p>}{x.status==='Checking'?(()=>{const elapsed=Math.max(0,now-new Date(x.createdAt).getTime());const remaining=Math.max(0,Math.ceil((120000-elapsed)/1000));const progress=Math.min(100,Math.floor(elapsed/120000*100));const stage=progress<25?'Checking request details':progress<50?'Validating student profile':progress<75?'Reviewing requested amount and term':progress<100?'Preparing decision':'Completing check';return <div aria-live="polite"><p><strong>Loan Check · {stage}</strong></p><p>Time remaining: {String(Math.floor(remaining/60)).padStart(2,'0')}:{String(remaining%60).padStart(2,'0')} · {progress}%</p><div className="pg-progress" role="progressbar" aria-label="Loan check progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div style={{width:progress+'%'}}/></div><span>Checking</span></div>;})():<span>{x.status}</span>}</div>)}
 
 </section>;
}
export function ServicesPage({ account, institution, userId, supabase }: { account: string; institution: string; userId: string; supabase: SupabaseClient }) {
  const [statementBusy,setStatementBusy]=useState(false);
  const [statementPeriod,setStatementPeriod]=useState('3');
  const [statementFrom,setStatementFrom]=useState('');
  const [statementTo,setStatementTo]=useState(new Date().toISOString().slice(0,10));
  const [statementError,setStatementError]=useState('');
  const data = walletInfo(account);
  const money = (n: number) => 'TZS ' + n.toLocaleString('en-TZ');
  async function downloadStatement(){
   setStatementBusy(true);setStatementError('');
   try{
    const today=new Date();let from=statementFrom,to=statementTo;
    if(statementPeriod!=='custom'){
     const d=new Date(today);d.setMonth(d.getMonth()-Number(statementPeriod));
     from=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
     to=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
    }
    if(!from||!to||from>to||to>new Date().toISOString().slice(0,10))throw new Error('Select a valid date range ending no later than today.');
    const [profile,wallet,ledger]=await Promise.all([
     supabase.from('pg_profiles').select('full_name').eq('user_id',userId).maybeSingle(),
     supabase.from('pg_demo_wallets').select('balance_tzs').eq('user_id',userId).maybeSingle(),
     supabase.from('pg_demo_transactions').select('id,kind,amount_tzs,delta_tzs,note,created_at').eq('user_id',userId).order('created_at',{ascending:true}).limit(5001)
    ]);
    if(profile.error||wallet.error||ledger.error)throw new Error(profile.error?.message||wallet.error?.message||ledger.error?.message||'Statement unavailable');
    if(!wallet.data)throw new Error('Wallet account not found.');
    if((ledger.data||[]).length>5000)throw new Error('More than 5,000 transactions found; a complete statement requires additional pagination.');
    const {data:approvals,error:approvalError}=await supabase.from('pg_student_requests').select('institution_id,course_id,admission_number').eq('user_id',userId).eq('status','approved').not('course_id','is',null).limit(1);
    if(approvalError)throw new Error(approvalError.message);
    const approved=approvals?.[0];let institution='Not linked',course='Not linked',admission='Not available';
    if(approved){
     admission=approved.admission_number||admission;
     const [inst,programme]=await Promise.all([
      supabase.from('pg_institutions').select('name').eq('id',approved.institution_id).maybeSingle(),
      supabase.from('pg_courses').select('name').eq('id',approved.course_id).maybeSingle()
     ]);
     if(inst.error||programme.error)throw new Error(inst.error?.message||programme.error?.message||'Unable to load academic details.');
     institution=inst.data?.name||institution;course=programme.data?.name||course;
    }
    downloadAccountStatementPdf(account,profile.data?.full_name||'Student',(ledger.data||[]) as StatementTransaction[],Number(wallet.data.balance_tzs),from,to,institution,course,admission);
   }catch(error){setStatementError(error instanceof Error?error.message:'Unable to generate statement.');}
   finally{setStatementBusy(false);}
  }
  return <>
    <h1>Student Services</h1>
    <p>Manage your student payments and financial records in one place.</p>
    
    <div className="pg-services-grid">
      <Link className="pg-service-tile" to="/pay-fee" state={{from:"/services"}}><span className="pg-service-symbol" aria-hidden="true">▤</span><strong>Tuition Fees</strong><small>Enter amount and pay fees</small><span className="pg-service-arrow">›</span></Link>
      <Link className="pg-service-tile" to="/history" state={{from:"/services"}}><span className="pg-service-symbol" aria-hidden="true">◷</span><strong>Transactions</strong><small>Payment history</small><span className="pg-service-arrow">›</span></Link>
      <Link className="pg-service-tile" to="/add-money" state={{from:"/services"}}><span className="pg-service-symbol" aria-hidden="true">＋</span><strong>Add Money</strong><small>Fund your wallet</small><span className="pg-service-arrow">›</span></Link>
      <Link className="pg-service-tile" to="/linked-accounts"><span className="pg-service-symbol" aria-hidden="true">▣</span><strong>Linked Accounts</strong><small>NMB Bank only</small><span className="pg-service-arrow">›</span></Link>
      <Link className="pg-service-tile" to="/government-loan"><span className="pg-service-symbol" aria-hidden="true">▤</span><strong>Government Loan</strong><small>HESLB allocation status</small><span className="pg-service-arrow">›</span></Link>
      <Link className="pg-service-tile" to="/quick-loan" state={{from:"/services"}}><span className="pg-service-symbol" aria-hidden="true">⚡</span><strong>Personal Boost Loan</strong><small>Short-term emergency borrowing</small><span className="pg-service-arrow">›</span></Link>
    </div>
    <section className="pg-feature-card pg-statement-card">
     <div className="pg-services-heading"><h2>Account Statement</h2><span>PDF</span></div>
     <p className="pg-note">A detailed statement with dates, references, credits, debits and running balances.</p>
     <div className="pg-statement-filters"><label htmlFor="statement-period">Statement period</label><select id="statement-period" value={statementPeriod} onChange={e=>setStatementPeriod(e.target.value)}><option value="1">Last 1 month</option><option value="3">Last 3 months</option><option value="6">Last 6 months</option><option value="12">Last 12 months</option><option value="custom">Custom date range</option></select>
     {statementPeriod==='custom'&&<div className="pg-statement-dates"><div><label htmlFor="statement-from">From</label><input id="statement-from" type="date" value={statementFrom} onChange={e=>setStatementFrom(e.target.value)}/></div><div><label htmlFor="statement-to">To</label><input id="statement-to" type="date" value={statementTo} onChange={e=>setStatementTo(e.target.value)}/></div></div>}</div>
     <button className="pg-button" type="button" disabled={statementBusy} onClick={()=>void downloadStatement()}>{statementBusy?'Preparing statement…':'Download PDF Statement ↓'}</button>{statementError&&<p role="alert" className="pg-error">{statementError}</p>}
    </section>
    <SupportInbox supabase={supabase} userId={userId} role="student" />
  </>;
}


type SupportInquiry={id:string;user_id:string;destination:'platform'|'institution';institution_id:string|null;category:string;subject:string;status:string;created_at:string;updated_at:string;transaction_id:string|null;transaction_date:string|null;transaction_type:string|null};
type SupportMessage={id:string;inquiry_id:string;sender_id:string;body:string;created_at:string};
export function SupportInbox({supabase,userId,role,institutionId}:{supabase:SupabaseClient;userId:string;role:'student'|'admin'|'institution';institutionId?:string}){
 const [tickets,setTickets]=useState<SupportInquiry[]>([]),[messages,setMessages]=useState<SupportMessage[]>([]);
 const [transactionId,setTransactionId]=useState(''),[transactionRows,setTransactionRows]=useState<{id:string;kind:string;created_at:string;amount_tzs:number}[]>([]);
 const [selected,setSelected]=useState(''),[destination,setDestination]=useState('platform'),[linkedInstitution,setLinkedInstitution]=useState(''),[institutions,setInstitutions]=useState<{id:string;name:string}[]>([]);
 const [category,setCategory]=useState(options[0]),[subject,setSubject]=useState(options[0]),[body,setBody]=useState(''),[reply,setReply]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 async function refresh(){
  const query=supabase.from('pg_support_inquiries').select('id,user_id,destination,institution_id,category,subject,status,created_at,updated_at,transaction_id,transaction_date,transaction_type').order('created_at',{ascending:false}).limit(200);
  const result=await (role==='student'?query.eq('user_id',userId):role==='admin'?query.eq('destination','platform'):query.eq('institution_id',institutionId||''));
  if(result.error)throw result.error;
  setTickets(result.data||[]);
  const ids=(result.data||[]).map(t=>t.id);
  if(!ids.length){setMessages([]);return;}
  const msgs=await supabase.from('pg_support_messages').select('id,inquiry_id,sender_id,body,created_at').in('inquiry_id',ids).order('created_at',{ascending:true}).limit(1000);
  if(msgs.error)throw msgs.error;
  setMessages(msgs.data||[]);
 }
 useEffect(()=>{let active=true;async function load(){try{await refresh();if(role==='student'){const req=await supabase.from('pg_student_requests').select('institution_id').eq('user_id',userId).eq('status','approved');if(req.error)throw req.error;const ids=[...new Set((req.data||[]).map(x=>x.institution_id))];if(ids.length){const names=await supabase.from('pg_institutions').select('id,name').in('id',ids);if(names.error)throw names.error;if(active)setInstitutions(names.data||[])}}const tx=await supabase.from('pg_demo_transactions').select('id,kind,created_at,amount_tzs').eq('user_id',userId).order('created_at',{ascending:false}).limit(150);if(tx.error)throw tx.error;if(active)setTransactionRows(tx.data||[]);}catch(e){if(active)setError(e instanceof Error?e.message:String(e))}finally{if(active)setLoading(false)}}void load();return()=>{active=false}},[supabase,userId,role,institutionId]);
 async function createTicket(e:FormEvent<HTMLFormElement>){e.preventDefault();if(busy)return;setBusy(true);setError('');setNotice('');
  try{if(destination==='institution'&&!linkedInstitution)throw new Error('Select an institution.');
   const selectedTx=transactionRows.find(t=>t.id===transactionId);
   const q=await supabase.from('pg_support_inquiries').insert({user_id:userId,destination,institution_id:destination==='institution'?linkedInstitution:null,category,subject:subject.trim(),transaction_id:selectedTx?.id||null,transaction_date:selectedTx?.created_at||null,transaction_type:selectedTx?.kind||null}).select('id').single();
   if(q.error)throw q.error;
   const m=await supabase.from('pg_support_messages').insert({inquiry_id:q.data.id,sender_id:userId,body:body.trim()});
   if(m.error)throw m.error;
   setSubject(options[0]);setBody('');setTransactionId('');setSelected(q.data.id);setNotice('Inquiry submitted successfully.');await refresh();
  }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}
 }
 async function sendReply(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!selected||!reply.trim()||busy)return;setBusy(true);setError('');try{
  const m=await supabase.from('pg_support_messages').insert({inquiry_id:selected,sender_id:userId,body:reply.trim()});if(m.error)throw m.error;setReply('');await refresh();
 }catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
 async function changeStatus(status:string){if(!selected)return;setBusy(true);setError('');try{const r=await supabase.from('pg_support_inquiries').update({status}).eq('id',selected);if(r.error)throw r.error;await refresh()}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}}
 const current=tickets.find(t=>t.id===selected);
 return <section className="pg-feature-card pg-support"><div className="pg-services-heading"><h2>{role==='student'?'Service Requests':role==='admin'?'Platform Inquiries':'Institution Inquiries'}</h2><span>{tickets.length} inquiries</span></div>
 {role==='student'&&<form className="pg-form pg-services-form" onSubmit={e=>void createTicket(e)}>
 <label htmlFor="support-destination">Send inquiry to</label><select id="support-destination" value={destination} onChange={e=>setDestination(e.target.value)}><option value="platform">PlayGo Support</option><option value="institution" disabled={!institutions.length}>My Institution</option></select>
 {destination==='institution'&&<><label htmlFor="support-institution">Institution</label><select id="support-institution" value={linkedInstitution} onChange={e=>setLinkedInstitution(e.target.value)} required><option value="">Select institution</option>{institutions.map(i=><option value={i.id} key={i.id}>{i.name}</option>)}</select></>}
 <label htmlFor="support-category">Request type</label><select id="support-category" value={category} onChange={e=>setCategory(e.target.value)}>{options.map(x=><option key={x}>{x}</option>)}</select>
 <label htmlFor="support-subject">Subject</label><select id="support-subject" required value={subject} onChange={e=>setSubject(e.target.value)}>{options.map(x=><option key={x} value={x}>{x}</option>)}</select>
 <label htmlFor="support-transaction">Transaction reference (optional)</label><select id="support-transaction" value={transactionId} onChange={e=>setTransactionId(e.target.value)}><option value="">No transaction selected</option>{transactionRows.map(t=><option key={t.id} value={t.id}>{t.kind.replace(/_/g,' ')} · {new Date(t.created_at).toLocaleDateString('en-GB')} · TZS {Number(t.amount_tzs).toLocaleString('en-TZ')} · {t.id.slice(0,8)}</option>)}</select>{transactionId&&<div className="pg-details">{(()=>{const t=transactionRows.find(x=>x.id===transactionId);return t?<><p><strong>Transaction ID</strong><span>{t.id}</span></p><p><strong>Date</strong><span>{new Date(t.created_at).toLocaleString('en-GB')}</span></p><p><strong>Transaction type</strong><span>{t.kind.replace(/_/g,' ')}</span></p></>:null})()}</div>}<label htmlFor="support-description">Describe your inquiry</label><textarea id="support-description" required minLength={10} maxLength={2000} rows={4} value={body} onChange={e=>setBody(e.target.value)}/>
 <button className="pg-button" disabled={busy} type="submit">{busy?'Submitting…':'Send Inquiry'}</button></form>}
 {error&&<p className="pg-error" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
 <h3>{role==='student'?'My Inquiries':'Incoming Inquiries'}</h3>
 {loading?<p>Loading inquiries…</p>:!tickets.length?<p>No inquiries yet.</p>:<div className="pg-support-layout"><div className="pg-support-tickets">{tickets.map(t=><button key={t.id} type="button" className={selected===t.id?'pg-support-ticket active':'pg-support-ticket'} onClick={()=>setSelected(t.id)}><strong>{t.subject}</strong><small>{t.category} · {new Date(t.created_at).toLocaleDateString('en-GB')}</small><span>{t.status.replace('_',' ')}</span><small>#{t.id.slice(0,8)}</small></button>)}</div>
 <div className="pg-support-thread">{current?<><h3>{current.subject}</h3><p className="pg-note">{current.category} · {current.destination==='platform'?'PlayGo Support':'Institution Support'} · {current.status.replace('_',' ')}</p>{current.transaction_id&&<div className="pg-details"><p><strong>Transaction ID</strong><span>{current.transaction_id}</span></p><p><strong>Transaction Date</strong><span>{current.transaction_date?new Date(current.transaction_date).toLocaleString('en-GB'):'-'}</span></p><p><strong>Transaction Type</strong><span>{current.transaction_type?.replace(/_/g,' ')}</span></p></div>}
 <div className="pg-support-messages">{messages.filter(m=>m.inquiry_id===current.id).map(m=><div key={m.id} className={m.sender_id===userId?'pg-support-message mine':'pg-support-message'}><strong>{m.sender_id===current.user_id?'Student':current.destination==='platform'?'PlayGo Support':'Institution Support'}</strong><p>{m.body}</p><small>{new Date(m.created_at).toLocaleString('en-GB')}</small></div>)}</div>
 {role!=='student'&&<div className="pg-support-status"><label htmlFor="support-status">Status</label><select id="support-status" value={current.status} disabled={busy} onChange={e=>void changeStatus(e.target.value)}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></div>}
 {current.status!=='closed'&&<form className="pg-form" onSubmit={e=>void sendReply(e)}><label htmlFor="support-reply">Reply</label><textarea id="support-reply" rows={3} required maxLength={2000} value={reply} onChange={e=>setReply(e.target.value)}/><button className="pg-button" type="submit" disabled={busy||!reply.trim()}>Send Reply</button></form>}</>:<p>Select an inquiry to view the conversation.</p>}</div></div>}
 </section>
}
