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
export function GovernmentStudentLoan(){
 return <section className="pg-feature-card" id="government-loan">
 <div className="pg-services-heading"><h2>Government Student Loan</h2><span>HESLB · Status only</span></div>
 <p>View your government student loan allocation and disbursement status when official integration becomes available.</p>
 <div className="pg-details">
 <p><strong>Government provider</strong><span>HESLB</span></p>
 <p><strong>Allocation status</strong><span>Not connected · Unknown</span></p>
 <p><strong>Allocated amount</strong><span>Not available</span></p>
 <p><strong>Disbursement status</strong><span>Not available</span></p>
 </div>
 <p className="pg-note">PlayGo is not connected to HESLB. Check the official HESLB student portal for verified allocation and disbursement information. This page does not offer personal borrowing.</p>
 </section>;
}
type QuickLoanRequest={id:string;account:string;amount:number;termDays:number;reason:string;interestRate?:number;interestAmount?:number;totalRepayment?:number;createdAt:string;status:'Demo only · Not approved'};
const QUICK_KEY='playgo.demo.quick-loan.v1';
function getQuickLoans():QuickLoanRequest[]{try{const x:unknown=JSON.parse(localStorage.getItem(QUICK_KEY)||'[]');return Array.isArray(x)?x as QuickLoanRequest[]:[];}catch{return [];}}
export function QuickLoan({account}:{account:string}){
 const [amount,setAmount]=useState('');const [term,setTerm]=useState('30');const [rate,setRate]=useState('3');const [reason,setReason]=useState('Emergency student expenses');
 const [message,setMessage]=useState('');const [requests,setRequests]=useState(()=>getQuickLoans().filter(x=>x.account===account));
 const principal=Number(amount);const interestRate=Number(rate);const validPreview=Number.isSafeInteger(principal)&&principal>=5000&&principal<=500000;const interestAmount=validPreview?Math.round(principal*interestRate/100):0;const totalRepayment=validPreview?principal+interestAmount:0;
 function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const n=Number(amount),days=Number(term);setMessage('');
 if(!Number.isSafeInteger(n)||n<5000||n>500000){setMessage('Demo amount must be TZS 5,000–500,000.');return;}
 if(![7,14,30].includes(days)){setMessage('Choose a valid period.');return;}
 if(![3,4,5].includes(interestRate)){setMessage('Select a demonstration interest rate between 3% and 5%.');return;}
 const request:QuickLoanRequest={id:'QL-'+crypto.randomUUID().slice(0,8).toUpperCase(),account,amount:n,termDays:days,reason,interestRate,interestAmount,totalRepayment,createdAt:new Date().toISOString(),status:'Demo only · Not approved'};
 try{const all=[...getQuickLoans(),request];localStorage.setItem(QUICK_KEY,JSON.stringify(all));setRequests(all.filter(x=>x.account===account));setAmount('');setMessage('Demo quick-loan request saved. No loan approved, no funds added to wallet.');}catch{setMessage('Could not save demo request.');}}
 return <section className="pg-feature-card" id="quick-loan">
 <div className="pg-services-heading"><h2>Personal Boost Loan</h2><span>Demo only</span></div>
 <p>Need money for urgent student expenses? Explore a short-term personal boost request, separate from government student funding.</p>
 <div className="pg-details"><p><strong>Available to borrow</strong><span>Not assessed</span></p><p><strong>Approved loan</strong><span>None</span></p><p><strong>Instant wallet top-up</strong><span>Disabled until lender integration</span></p></div>
 <form className="pg-form" onSubmit={submit}>
 <label htmlFor="quick-amount">Amount requested (TZS)</label><input id="quick-amount" type="number" inputMode="numeric" min={5000} max={500000} step={1000} value={amount} onChange={e=>setAmount(e.target.value)} placeholder="e.g. 20000" required/>
 <label htmlFor="quick-term">Preferred repayment period</label><select id="quick-term" value={term} onChange={e=>setTerm(e.target.value)}><option value="7">7 days</option><option value="14">14 days</option><option value="30">30 days</option></select>
 <label htmlFor="quick-rate">Illustrative interest rate (flat, once per loan)</label><select id="quick-rate" value={rate} onChange={e=>setRate(e.target.value)}><option value="3">3%</option><option value="4">4%</option><option value="5">5%</option></select>
 <label htmlFor="quick-reason">Purpose</label><select id="quick-reason" value={reason} onChange={e=>setReason(e.target.value)}><option>Emergency student expenses</option><option>Books and materials</option><option>Meals and transport</option><option>Temporary wallet shortfall</option></select>
 <div className="pg-details" aria-live="polite"><p><strong>Requested principal</strong><span>{validPreview?`TZS ${principal.toLocaleString("en-TZ")}`:"Enter an amount"}</span></p><p><strong>Illustrative interest ({rate}%)</strong><span>TZS {interestAmount.toLocaleString("en-TZ")}</span></p><p><strong>Illustrative total repayment</strong><span>TZS {totalRepayment.toLocaleString("en-TZ")}</span></p><p><strong>Repayment period</strong><span>{term} days</span></p></div>
 <p className="pg-note">Illustrative flat interest charged once for the selected term, not per day or month. No lender is connected, and this is not an approved rate, credit offer or binding repayment schedule. Eligibility and any additional fees have not been determined. No debt or wallet credit is created.</p>
 <button className="pg-button" type="submit">Save Quick Loan Demo Request</button></form>
 {message&&<p className="pg-services-message" role="status">{message}</p>}
 <h3>My Quick Loan Requests</h3>{requests.length===0?<p className="pg-note">No requests yet.</p>:requests.slice().reverse().map(x=><div key={x.id} className="pg-service-request"><strong>TZS {x.amount.toLocaleString('en-TZ')}</strong><small>{x.id} · {new Date(x.createdAt).toLocaleDateString('en-TZ')}</small><p>{x.termDays} days · {x.reason}</p>{x.interestRate!=null&&x.totalRepayment!=null&&<p>Demo interest: {x.interestRate}% · Illustrative repayment: TZS {x.totalRepayment.toLocaleString("en-TZ")}</p>}<span>{x.status}</span></div>)}
 <p className="pg-note">Requests are stored on this device only. Real quick loans and automatic top-ups require an approved lender, credit assessment and explicit loan terms.</p>
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
      <Link className="pg-service-tile" to="/government-loan"><span className="pg-service-symbol" aria-hidden="true">▤</span><strong>Government Loan</strong><small>HESLB allocation status</small><span className="pg-service-arrow">›</span></Link>
      <Link className="pg-service-tile" to="/quick-loan"><span className="pg-service-symbol" aria-hidden="true">⚡</span><strong>Personal Boost Loan</strong><small>Short-term emergency borrowing</small><span className="pg-service-arrow">›</span></Link>
    </div>
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
