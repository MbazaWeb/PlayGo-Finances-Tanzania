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
  const [paying,setPaying]=useState(false);
  const [otp,setOtp]=useState('');
  const [challenge,setChallenge]=useState<{code:string;expires:number}|null>(null);
  const merchant = DEMO_MERCHANTS.find(m => m.id === selected);
  const matches = useMemo(() => DEMO_MERCHANTS.filter(m => `${m.name} ${m.category} ${m.id}`.toLowerCase().includes(search.toLowerCase().trim())), [search]);
  const [balance,setBalance]=useState<number|null>(null);
  useEffect(()=>{let active=true;async function refresh(){const {data,error}=await supabase.from('pg_demo_wallets').select('balance_tzs').eq('user_id',userId).maybeSingle();if(!active)return;if(error){setError('Unable to load wallet balance: '+error.message);setBalance(null);}else{setBalance(Number(data?.balance_tzs??0));setError('');}}void refresh();window.addEventListener('playgo:wallet-updated',refresh);return()=>{active=false;window.removeEventListener('playgo:wallet-updated',refresh)};},[supabase,userId]);
  const value = Number(amount);
  const fee=Number.isSafeInteger(value)&&value>0?Math.ceil(value/100):0;
  const total=value+fee;
  function selectMerchant(id: string) { setSelected(id); setReview(false); setError(''); setAmount(''); setReference('');setChallenge(null);setOtp(''); }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!merchant || !Number.isSafeInteger(value) || value < 1 || value > 5000000) { setError('Enter a valid whole-number amount in TZS.'); return; }
    if (balance===null || total > balance) { setError('Insufficient wallet balance. Add funds before paying.'); return; }
    setError(''); setReview(true);
  }
  function confirm(){setOtp('');setChallenge({code:String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,'0'),expires:Date.now()+45000});setError('');}
  async function pay(){if(!merchant||!challenge||Date.now()>challenge.expires||otp!==challenge.code){setError('Incorrect or expired verification code.');return;}if(paying)return;setPaying(true);setError('');try{
   const txId=crypto.randomUUID();const note=(merchant.id+'|'+merchant.name+(reference?'|'+reference:'')).slice(0,250);
   const {error:e}=await supabase.rpc('pg_record_demo_transaction',{p_id:txId,p_kind:'merchant_payment',p_amount:value,p_note:note});if(e)throw e;
   const receipt={id:txId,kind:'Merchant Payment',amount:value,from:account,to:merchant.name+' ('+merchant.id+')',at:new Date().toISOString(),note:'Fee: TZS '+fee.toLocaleString('en-TZ')+(reference?' · '+reference:'')};
   sessionStorage.setItem('playgo.demo.receipt.v1',JSON.stringify(receipt));window.dispatchEvent(new Event('playgo:wallet-updated'));navigate('/transaction-status',{replace:true});
  }catch(e){setError(e instanceof Error?e.message:'Payment failed.')}finally{setPaying(false)}}
  return <>
    <h1>Pay Merchant</h1>
    <p>Pay participating merchants from your PlayGo wallet.</p>
    
    <div className="pg-merchant-balance"><span>Available wallet balance</span><strong>TZS {balance===null?'Loading…':balance.toLocaleString('en-TZ')}</strong></div>
    {!review ? <>
      <label className="pg-merchant-label" htmlFor="merchant-search">Find a merchant</label>
      <input className="pg-merchant-search" id="merchant-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, category or merchant ID" />
      <div className="pg-merchant-list" role="group" aria-label="Merchants">
        {matches.length ? matches.map(m => <button key={m.id} type="button" onClick={() => selectMerchant(m.id)} className={'pg-merchant-option' + (selected === m.id ? ' pg-merchant-selected' : '')} aria-pressed={selected === m.id}>
          <span className="pg-merchant-avatar">{m.initials}</span><span className="pg-merchant-meta"><strong>{m.name}</strong><small>{m.category} · {m.id}</small></span><span aria-hidden="true">{selected === m.id ? '✓' : '›'}</span>
        </button>) : <p className="pg-note">No matching merchants.</p>}
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
      <div className="pg-details"><p><strong>Merchant</strong><span>{merchant?.name}</span></p><p><strong>Merchant ID</strong><span>{merchant?.id}</span></p><p><strong>Amount</strong><span>TZS {value.toLocaleString('en-TZ')}</span></p><p><strong>Fee</strong><span>TZS {fee.toLocaleString('en-TZ')} (1%)</span></p><p><strong>Total debit</strong><span>TZS {total.toLocaleString('en-TZ')}</span></p><p><strong>From wallet</strong><span>{account}</span></p>{reference && <p><strong>Note</strong><span>{reference}</span></p>}</div>
      {!challenge?<button className="pg-button" onClick={confirm}>Continue to OTP →</button>:<div className="pg-form"><span>Verification code</span><strong className="pg-merchant-otp-code">{challenge.code}</strong><small>Expires in 45 seconds</small><label htmlFor="merchant-otp">Enter 6-digit code</label><input id="merchant-otp" inputMode="numeric" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/[^0-9]/g,'').slice(0,6))} placeholder="6-digit code"/><button className="pg-button" type="button" disabled={paying||otp.length!==6} onClick={()=>void pay()}>{paying?'Processing…':'Confirm Payment →'}</button><button className="pg-button pg-outline" type="button" onClick={confirm}>New code</button></div>}
      <button className="pg-button pg-outline" onClick={() => {setReview(false);setChallenge(null);setOtp("");}}>Edit Payment</button>
    </div>}
    {error && <p className="pg-error" role="alert">{error}</p>}
    
  </>;
}
