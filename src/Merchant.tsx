import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SupabaseClient } from '@supabase/supabase-js';

// Fictional merchant directory for demonstration. No real businesses are represented.
export const DEMO_MERCHANTS = [
  { id: 'PGM1001', name: 'Campus Bookshop', category: 'Books & Stationery', initials: 'CB' },
  { id: 'PGM1002', name: 'Student Cafeteria', category: 'Food & Drinks', initials: 'SC' },
  { id: 'PGM1003', name: 'Campus Print Hub', category: 'Printing & Copying', initials: 'PH' },
  { id: 'PGM1004', name: 'Student Essentials', category: 'Shopping', initials: 'SE' },
  { id: 'PGM1005', name: 'Campus Laundry', category: 'Lifestyle', initials: 'CL' },
] as const;

export function MerchantPage({ account, userId, supabase }: { account: string; userId: string; supabase: SupabaseClient }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [review, setReview] = useState(false);
  const [error, setError] = useState('');
  const merchant = DEMO_MERCHANTS.find(m => m.id === selected);
  const matches = useMemo(() => DEMO_MERCHANTS.filter(m => `${m.name} ${m.category} ${m.id}`.toLowerCase().includes(search.toLowerCase().trim())), [search]);
  const [balance,setBalance]=useState<number|null>(null);
  useEffect(()=>{let active=true;async function refresh(){const {data,error}=await supabase.from('pg_demo_wallets').select('balance_tzs').eq('user_id',userId).maybeSingle();if(!active)return;if(error){setError('Unable to load wallet balance: '+error.message);setBalance(null);}else{setBalance(Number(data?.balance_tzs??0));setError('');}}void refresh();window.addEventListener('playgo:wallet-updated',refresh);return()=>{active=false;window.removeEventListener('playgo:wallet-updated',refresh)};},[supabase,userId]);
  const value = Number(amount);
  function selectMerchant(id: string) { setSelected(id); setReview(false); setError(''); setAmount(''); setReference(''); }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!merchant || !Number.isSafeInteger(value) || value < 1 || value > 100000000) { setError('Enter a valid whole-number amount in TZS.'); return; }
    if (balance===null || value > balance) { setError('Insufficient wallet balance. Add funds before paying.'); return; }
    setError(''); setReview(true);
  }
  function confirm() {
    setError('Merchant checkout is not connected to the Supabase transaction ledger yet. No payment has been made.');
    setReview(false);
  }
  return <>
    <h1>Pay Merchant</h1>
    <p>Pay participating merchants from your PlayGo wallet.</p>
    
    <div className="pg-merchant-balance"><span>Available wallet balance</span><strong>TZS {balance===null?'Loading…':balance.toLocaleString('en-TZ')}</strong></div>
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
    
  </>;
}
