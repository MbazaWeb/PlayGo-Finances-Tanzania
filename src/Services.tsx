import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { walletInfo } from './Wallet';

type Request = { id: string; account: string; type: string; details: string; createdAt: string; status: 'Submitted · Demo' };
const KEY = 'playgo.demo.service-requests.v1';
const options = ['Fee payment inquiry', 'Transaction inquiry', 'Account assistance', 'Other student finance inquiry'];
function readRequests(): Request[] {
  try { const data: unknown = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(data) ? data as Request[] : []; }
  catch { return []; }
}
function csvCell(value: unknown): string {
  const text = String(value ?? '');
  const safe = /^[\s]*[=+@\-\t\r]/.test(text) ? "'" + text : text;
  return '"' + safe.replace(/"/g, '""') + '"';
}
function downloadStatement(account: string) {
  const txs = walletInfo(account).transactions;
  const header = ['Reference','Date','Type','Amount TZS','From','To','Note'];
  const rows = txs.map(t => [t.id, t.at, t.kind, t.amount, t.from, t.to, t.note]);
  const csv = [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF',csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `playgo-demo-statement-${account}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
type LoanRequest = { id:string; account:string; amount:number; purpose:string; repaymentMonths:number; createdAt:string; status:'Demo request · Not submitted to lender' };
const LOAN_KEY='playgo.demo.student-loans.v1';
function readLoans():LoanRequest[]{try{const data:unknown=JSON.parse(localStorage.getItem(LOAN_KEY)||'[]');return Array.isArray(data)?data as LoanRequest[]:[];}catch{return [];}}
function StudentLoan({account}:{account:string}){
 const [amount,setAmount]=useState('');
 const [purpose,setPurpose]=useState('Tuition and academic expenses');
 const [months,setMonths]=useState('12');
 const [loans,setLoans]=useState(()=>readLoans().filter(x=>x.account===account));
 const [message,setMessage]=useState('');
 const [open,setOpen]=useState(false);
 function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setMessage('');
  const n=Number(amount),m=Number(months);
  if(!Number.isSafeInteger(n)||n<10000||n>5000000){setMessage('Enter an amount between TZS 10,000 and TZS 5,000,000 for this demo.');return;}
  if(!Number.isInteger(m)||m<1||m>36){setMessage('Choose a valid repayment period.');return;}
  const item:LoanRequest={id:'LN-'+crypto.randomUUID().slice(0,8).toUpperCase(),account,amount:n,purpose,repaymentMonths:m,createdAt:new Date().toISOString(),status:'Demo request · Not submitted to lender'};
  try{const all=[...readLoans(),item];localStorage.setItem(LOAN_KEY,JSON.stringify(all));setLoans(all.filter(x=>x.account===account));setAmount('');setMessage('Demo loan request saved on this device. No lender received this application.');setOpen(false);}
  catch{setMessage('Could not save the demo request on this device.');}
 }
 return <section className="pg-feature-card" id="student-loan" style={{minWidth:0}}>
  <div className="pg-services-heading"><h2>Student Loan</h2><span>Demo · No disbursement</span></div>
  <p>View funding allocation status and explore a student borrowing request.</p>
  <div className="pg-details">
   <p><strong>Government funding (HESLB)</strong><span>Not connected · Allocation unknown</span></p>
   <p><strong>Private funding</strong><span>Not connected · Allocation unknown</span></p>
   <p><strong>Verified funding received</strong><span>Not available</span></p>
   <p><strong>Borrowing eligibility</strong><span>Not assessed</span></p>
  </div>
  <p className="pg-note">Funding must be confirmed through the official HESLB portal or the relevant private provider. PlayGo does not currently check or change your allocation.</p>
  <button type="button" className="pg-button pg-outline" onClick={()=>setOpen(v=>!v)}>{open?'Close demo loan form':'Request Student Loan (Demo) →'}</button>
  {open&&<form className="pg-form" onSubmit={submit}>
   <label htmlFor="loan-amount">Amount requested (TZS)</label>
   <input id="loan-amount" inputMode="numeric" type="number" min={10000} max={5000000} step={1000} required value={amount} onChange={e=>setAmount(e.target.value)} placeholder="e.g. 200000"/>
   <label htmlFor="loan-purpose">Purpose</label>
   <select id="loan-purpose" value={purpose} onChange={e=>setPurpose(e.target.value)}><option>Tuition and academic expenses</option><option>Books and learning materials</option><option>Accommodation</option><option>Living expenses</option><option>Emergency student expenses</option></select>
   <label htmlFor="loan-period">Preferred repayment period</label>
   <select id="loan-period" value={months} onChange={e=>setMonths(e.target.value)}><option value="3">3 months</option><option value="6">6 months</option><option value="12">12 months</option><option value="24">24 months</option><option value="36">36 months</option></select>
   <p className="pg-note">This is not a credit offer or approval. Interest, fees, affordability, eligibility and repayment terms have not been determined.</p>
   <button className="pg-button" type="submit">Save Demo Loan Request</button>
  </form>}
  {message&&<p role="status" className="pg-services-message">{message}</p>}
  <h3>My Loan Requests</h3>
  {loans.length===0?<p className="pg-note">No demo loan requests yet.</p>:loans.slice().reverse().map(x=><div className="pg-service-request" key={x.id}><strong>TZS {x.amount.toLocaleString('en-TZ')}</strong><small>{x.id} · {new Date(x.createdAt).toLocaleDateString('en-TZ')}</small><p>{x.purpose} · Preferred period: {x.repaymentMonths} months</p><span>{x.status}</span></div>)}
  <p className="pg-note">Demo requests are stored in this browser only, not in Supabase. No money is lent or transferred.</p>
 </section>;
}
export function ServicesPage({ account, institution }: { account: string; institution: string }) {
  const [type, setType] = useState(options[0]);
  const [details, setDetails] = useState('');
  const [requests, setRequests] = useState(() => readRequests().filter(r => r.account === account));
  const [message, setMessage] = useState('');
  const data = walletInfo(account);
  const outstanding = Math.max(0, data.fee.total - data.fee.paid);
  const percent = data.fee.total > 0 ? Math.min(100, Math.round(data.fee.paid / data.fee.total * 100)) : 0;
  const money = (n: number) => 'TZS ' + n.toLocaleString('en-TZ');
  function submitRequest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (details.trim().length < 10 || details.trim().length > 500) { setMessage('Enter a description between 10 and 500 characters.'); return; }
    const item: Request = { id: 'SR-' + crypto.randomUUID().slice(0,8).toUpperCase(), account, type, details: details.trim(), createdAt: new Date().toISOString(), status: 'Submitted · Demo' };
    const next = [...readRequests(), item];
    try { localStorage.setItem(KEY, JSON.stringify(next)); setRequests(next.filter(r => r.account === account)); setDetails(''); setMessage(`Demo request ${item.id} saved on this device.`); }
    catch { setMessage('Could not save request. Check browser storage.'); }
  }
  return <>
    <h1>Student Services</h1>
    <p>Manage your student payments and financial records in one place.</p>
    <div className="pg-services-notice">DEMO MODE · No university or financial institution is connected.</div>
    <div className="pg-services-grid">
      <Link className="pg-service-tile" to="/pay-fee"><span className="pg-service-symbol" aria-hidden="true">▤</span><strong>Tuition Fees</strong><small>View and pay fees</small><span className="pg-service-arrow">›</span></Link>
      <Link className="pg-service-tile" to="/history"><span className="pg-service-symbol" aria-hidden="true">◷</span><strong>Transactions</strong><small>Payment history</small><span className="pg-service-arrow">›</span></Link>
      <Link className="pg-service-tile" to="/add-money"><span className="pg-service-symbol" aria-hidden="true">＋</span><strong>Add Money</strong><small>Fund your wallet</small><span className="pg-service-arrow">›</span></Link>
      <Link className="pg-service-tile" to="/profile"><span className="pg-service-symbol" aria-hidden="true">▣</span><strong>Linked Accounts</strong><small>NMB Bank only</small><span className="pg-service-arrow">›</span></Link>
      <a className="pg-service-tile" href="#student-loan"><span className="pg-service-symbol" aria-hidden="true">▤</span><strong>Student Loan</strong><small>Funding status & borrowing</small><span className="pg-service-arrow">›</span></a>
    </div>
    <StudentLoan account={account}/>
    <section className="pg-feature-card pg-service-fee">
      <div className="pg-services-heading"><h2>Fee Status</h2><span>Demo</span></div>
      <p className="pg-service-institution">{institution}</p>
      <div className="pg-fee-grid"><p>Total Fee<b>{money(data.fee.total)}</b></p><p>Paid<b>{money(data.fee.paid)}</b></p><p>Outstanding<b>{money(outstanding)}</b></p><p>Progress<b>{percent}%</b></p></div>
      <div className="pg-progress" role="progressbar" aria-label="Tuition fee paid" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><div style={{width: `${percent}%`}} /></div>
      {outstanding > 0 && <p className="pg-service-reminder">Outstanding fee: {money(outstanding)}. {data.fee.due ? `Demo due date: ${data.fee.due}.` : 'No due date configured.'}</p>}
      <Link className="pg-button" to="/pay-fee">Manage Fees →</Link>
    </section>
    <section className="pg-feature-card">
      <div className="pg-services-heading"><h2>Account Statement</h2><span>{data.transactions.length} records</span></div>
      <p>Export the transactions saved in this browser as a CSV statement. The statement is not an official bank record.</p>
      <button className="pg-button pg-outline" type="button" onClick={() => downloadStatement(account)}>Download Demo Statement (CSV)</button>
    </section>
    <section className="pg-feature-card">
      <div className="pg-services-heading"><h2>Service Requests</h2><span>Local only</span></div>
      <p>Submit an inquiry for your own records. Requests are not sent to PlayGo staff or a university.</p>
      <form className="pg-form pg-services-form" onSubmit={submitRequest}>
        <label htmlFor="pg-request-type">Request type</label>
        <select id="pg-request-type" value={type} onChange={e => setType(e.target.value)}>{options.map(x => <option key={x}>{x}</option>)}</select>
        <label htmlFor="pg-request-description">Description</label>
        <textarea id="pg-request-description" rows={4} maxLength={500} minLength={10} value={details} onChange={e => setDetails(e.target.value)} placeholder="Describe your question (do not include passwords, PINs or sensitive personal data)" required />
        <button className="pg-button" type="submit">Save Demo Request</button>
        {message && <p className="pg-services-message" role="status">{message}</p>}
      </form>
      <h3 className="pg-services-subtitle">My Requests</h3>
      {requests.length === 0 ? <p className="pg-note">No requests saved yet.</p> : <div className="pg-service-requests">{requests.slice().reverse().map(r => <div key={r.id} className="pg-service-request"><strong>{r.type}</strong><small>{r.id} · {new Date(r.createdAt).toLocaleDateString('en-TZ')}</small><p>{r.details}</p><span>{r.status}</span></div>)}</div>}
    </section>
  </>;
}
