import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SupabaseClient } from '@supabase/supabase-js';

type MerchantRecord={id:string;name:string;category:string;initials:string;operator:string};

export function MerchantPage({ account, userId, supabase }: { account: string; userId: string; supabase: SupabaseClient }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [merchants,setMerchants]=useState<MerchantRecord[]>([]);
  const [operator,setOperator]=useState('PlayGo');
  const [scanOpen,setScanOpen]=useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [review, setReview] = useState(false);
  const [error, setError] = useState('');
  const [paying,setPaying]=useState(false);
  const [otp,setOtp]=useState('');
  const [challenge,setChallenge]=useState<{code:string;expires:number}|null>(null);
  const merchant = merchants.find(m => m.id === selected);
  const [balance,setBalance]=useState<number|null>(null);
  useEffect(()=>{let mounted=true;void supabase.from('pg_merchants').select('id,name,category,initials,operator').eq('active',true).then(({data,error})=>{if(!mounted)return;if(error)setError('Unable to load merchants: '+error.message);else setMerchants(data||[])});return()=>{mounted=false}},[supabase]);
  useEffect(()=>{let active=true;async function refresh(){const {data,error}=await supabase.from('pg_demo_wallets').select('balance_tzs').eq('user_id',userId).maybeSingle();if(!active)return;if(error){setError('Unable to load wallet balance: '+error.message);setBalance(null);}else{setBalance(Number(data?.balance_tzs??0));setError('');}}void refresh();window.addEventListener('playgo:wallet-updated',refresh);return()=>{active=false;window.removeEventListener('playgo:wallet-updated',refresh)};},[supabase,userId]);
  const value = Number(amount);
  const fee=Number.isSafeInteger(value)&&value>0?Math.ceil(value/100):0;
  const total=value+fee;
  function selectMerchant(id: string) { setSelected(id); setReview(false); setError(''); setAmount(''); setReference('');setChallenge(null);setOtp(''); }
  function lookupMerchant(e:FormEvent){e.preventDefault();const found=operator==='PlayGo'?merchants.find(m=>m.id===search.trim()):undefined;if(found){selectMerchant(found.id);setError('')}else{setSelected(null);setError('Merchant not found. Check operator and ID.')}}
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
      <div className="pg-merchant-discovery"><div className="pg-merchant-methods"><button type="button" onClick={()=>setScanOpen(v=>!v)}>▣ Scan QR</button><button type="button" onClick={()=>setScanOpen(false)}>⌕ Merchant ID</button></div>
      {scanOpen?<MerchantQrScanner onScan={id=>{setScanOpen(false);setOperator('PlayGo');const code=id.match(/(?:^|[^0-9])([0-9]{8})(?:[^0-9]|$)/)?.[1]||id.trim();setSearch(code);const found=merchants.find(m=>m.id===code);if(found){selectMerchant(found.id)}else{setSelected(null);setError('Merchant not found.')}}} onClose={()=>setScanOpen(false)}/>:<form className="pg-form" onSubmit={lookupMerchant}><label htmlFor="merchant-operator">Select operator</label><select id="merchant-operator" value={operator} onChange={e=>{setOperator(e.target.value);setSelected(null)}}><option value="PlayGo">PlayGo Merchant</option><option value="M-Pesa">M-Pesa</option><option value="Mixx">Mixx by Yas</option><option value="Airtel Money">Airtel Money</option><option value="HaloPesa">HaloPesa</option></select><label htmlFor="merchant-search">Merchant ID</label><input id="merchant-search" value={search} onChange={e=>{setSearch(e.target.value);setSelected(null)}} placeholder="e.g. 10001002" inputMode="numeric" maxLength={8} pattern="[0-9]{8}" required/><button type="submit" className="pg-button">Search Merchant →</button></form>}
      {merchant&&<div className="pg-merchant-verified"><span className="pg-merchant-avatar">{merchant.initials}</span><div><strong>{merchant.name}</strong><small>{merchant.id} · {merchant.category}</small><span>✓ Merchant found</span></div></div>}</div>
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

type QRReader = {detect:(source:HTMLVideoElement|ImageBitmap)=>Promise<{rawValue:string}[]>};
type QRReaderConstructor = new (options:{formats:string[]})=>QRReader;
function MerchantQrScanner({onScan,onClose}:{onScan:(value:string)=>void;onClose:()=>void}){
 const video=useRef<HTMLVideoElement>(null);
 const [camera,setCamera]=useState(false);
 const [error,setError]=useState('');
 useEffect(()=>{
  if(!camera)return;
  let running=true,stream:MediaStream|undefined,frame=0;
  const Reader=(window as Window&{BarcodeDetector?:QRReaderConstructor}).BarcodeDetector;
  if(!Reader){setError('This browser does not support QR detection. Try Chrome or enter the merchant ID.');setCamera(false);return;}
  const reader=new Reader({formats:['qr_code']});
  async function scan(){
   if(!running)return;
   try{if(video.current&&video.current.readyState>=2){const codes=await reader.detect(video.current);if(codes.length){onScan(codes[0].rawValue);return;}}}
   catch{setError('Could not scan QR. Try again or enter the merchant ID.');}
   if(running)frame=requestAnimationFrame(()=>{void scan();});
  }
  void(async()=>{
   try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
    if(!running){stream.getTracks().forEach(track=>track.stop());return;}
    if(video.current){video.current.srcObject=stream;await video.current.play();}
    void scan();
   }catch{if(running){setError('Camera access unavailable. Allow camera permission or enter the merchant ID.');setCamera(false);}}
  })();
  return()=>{running=false;cancelAnimationFrame(frame);stream?.getTracks().forEach(track=>track.stop());};
 },[camera,onScan]);
 async function read(file:File){
  setError('');
  const Reader=(window as Window&{BarcodeDetector?:QRReaderConstructor}).BarcodeDetector;
  if(!Reader){setError('QR detection unavailable. Enter the merchant ID.');return;}
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10485760){setError('Select a JPG, PNG or WebP image under 10 MB.');return;}
  const bitmap=await createImageBitmap(file);
  try{const codes=await new Reader({formats:['qr_code']}).detect(bitmap);if(codes.length)onScan(codes[0].rawValue);else setError('No QR code found.');}finally{bitmap.close();}
 }
 return <section className="pg-merchant-scanner" aria-label="Scan merchant QR">
  <div className="pg-merchant-scanner-head"><strong>Scan Merchant QR</strong><button type="button" onClick={onClose} aria-label="Close scanner">✕</button></div>
  <p>Point your camera at the merchant QR code.</p>
  {camera&&<video ref={video} muted playsInline className="pg-merchant-video"/>}
  <button type="button" className="pg-button" onClick={()=>{setError('');setCamera(v=>!v);}}>{camera?'Stop Camera':'Open Camera'}</button>
  <label className="pg-merchant-upload">Upload QR image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0];if(file)void read(file).catch(()=>setError('Could not read QR image.'));e.target.value='';}}/></label>
  {error&&<p className="pg-error" role="alert">{error}</p>}
 </section>;
}
