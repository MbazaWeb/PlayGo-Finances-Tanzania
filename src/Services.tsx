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
      <Link className="pg-service-tile" to="/profile"><span className="pg-service-symbol" aria-hidden="true">▣</span><strong>Linked Accounts</strong><small>Mobile money & banks</small><span className="pg-service-arrow">›</span></Link>
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
