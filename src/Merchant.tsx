import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { beginMerchantPayment, walletInfo } from './Wallet';

// Fictional merchant directory for demonstration. No real businesses are represented.
export const DEMO_MERCHANTS = [
  { id: 'PGM1001', name: 'Campus Bookshop', category: 'Books & Stationery', initials: 'CB' },
  { id: 'PGM1002', name: 'Student Cafeteria', category: 'Food & Drinks', initials: 'SC' },
  { id: 'PGM1003', name: 'Campus Print Hub', category: 'Printing & Copying', initials: 'PH' },
  { id: 'PGM1004', name: 'Student Essentials', category: 'Shopping', initials: 'SE' },
  { id: 'PGM1005', name: 'Campus Laundry', category: 'Lifestyle', initials: 'CL' },
] as const;

export function MerchantPage({ account }: { account: string }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [review, setReview] = useState(false);
  const [error, setError] = useState('');
  const merchant = DEMO_MERCHANTS.find(m => m.id === selected);
  const matches = useMemo(() => DEMO_MERCHANTS.filter(m => `${m.name} ${m.category} ${m.id}`.toLowerCase().includes(search.toLowerCase().trim())), [search]);
  const balance = walletInfo(account).balance;
  const value = Number(amount);
  function selectMerchant(id: string) { setSelected(id); setReview(false); setError(''); setAmount(''); setReference(''); }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!merchant || !Number.isSafeInteger(value) || value < 1 || value > 100000000) { setError('Enter a valid whole-number amount in TZS.'); return; }
    if (value > balance) { setError('Insufficient wallet balance. Add demo money before paying.'); return; }
    setError(''); setReview(true);
  }
  function confirm() {
    if (!merchant || !Number.isSafeInteger(value) || value < 1 || value > walletInfo(account).balance) { setError('Wallet balance or amount changed. Review again.'); setReview(false); return; }
    beginMerchantPayment({ merchantId: merchant.id, amount: value, reference: reference.trim().slice(0, 80) }, navigate);
  }
  return <>
    <h1>Pay Merchant</h1>
    <p>Pay participating merchants from your PlayGo wallet.</p>
    <div className="pg-merchant-demo">DEMO MODE · Fictional merchants · No real payment</div>
    <div className="pg-merchant-balance"><span>Available wallet balance</span><strong>TZS {balance.toLocaleString('en-TZ')}</strong></div>
    {!review ? <>
      <label className="pg-merchant-label" htmlFor="merchant-search">Find a merchant</label>
      <input className="pg-merchant-search" id="merchant-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, category or merchant ID" />
      <div className="pg-merchant-list" role="group" aria-label="Demo merchants">
        {matches.length ? matches.map(m => <button key={m.id} type="button" onClick={() => selectMerchant(m.id)} className={'pg-merchant-option' + (selected === m.id ? ' pg-merchant-selected' : '')} aria-pressed={selected === m.id}>
          <span className="pg-merchant-avatar">{m.initials}</span><span className="pg-merchant-meta"><strong>{m.name}</strong><small>{m.category} · {m.id}</small></span><span aria-hidden="true">{selected === m.id ? '✓' : '›'}</span>
        </button>) : <p className="pg-note">No matching demo merchants.</p>}
      </div>
      {merchant && <form className="pg-form" onSubmit={submit}>
        <h2 className="pg-merchant-subtitle">Payment details</h2>
        <p>Paying <b>{merchant.name}</b> ({merchant.id})</p>
        <label htmlFor="merchant-amount">Amount (TZS)</label>
        <input id="merchant-amount" type="number" inputMode="numeric" min="1" step="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount" required />
        <label htmlFor="merchant-ref">Payment note (optional)</label>
        <input id="merchant-ref" maxLength={80} value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. Lunch or stationery" />
        <button className="pg-button" type="submit">Review Payment →</button>
      </form>}
    </> : <div className="pg-feature-card pg-merchant-review">
      <h2>Review Merchant Payment</h2>
      <div className="pg-details"><p><strong>Merchant</strong><span>{merchant?.name}</span></p><p><strong>Merchant ID</strong><span>{merchant?.id}</span></p><p><strong>Amount</strong><span>TZS {value.toLocaleString('en-TZ')}</span></p><p><strong>Fee</strong><span>TZS 0 · Demo</span></p><p><strong>From wallet</strong><span>{account}</span></p>{reference && <p><strong>Note</strong><span>{reference}</span></p>}</div>
      <button className="pg-button" onClick={confirm}>Continue to OTP →</button>
      <button className="pg-button pg-outline" onClick={() => setReview(false)}>Edit Payment</button>
    </div>}
    {error && <p className="pg-error" role="alert">{error}</p>}
    <p className="pg-note">The merchant list and payments are simulated. Never use this page to pay a real business.</p>
  </>;
}
