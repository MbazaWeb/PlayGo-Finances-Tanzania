import { useEffect, useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Link, Navigate, useNavigate } from 'react-router-dom';

export type Source = { id: string; kind: 'mobile'|'bank'; provider: string; holder: string; number: string };
export type Tx = { id: string; kind: string; amount: number; from: string; to: string; at: string; note: string };
type Fee = { total: number; paid: number; due: string };
type Store = { balances: Record<string,number>; fees: Record<string,Fee>; sources: Record<string,Source[]>; transactions: Tx[]; processed: string[] };
const KEY='playgo.demo.wallet.v1';
const DEFAULT_FEE=2000000;
const load=():Store=>{try {const x=JSON.parse(localStorage.getItem(KEY)||'null'); if(x && x.balances && x.fees && x.sources && Array.isArray(x.transactions) && Array.isArray(x.processed)) return x;}catch{} return {balances:{},fees:{},sources:{},transactions:[],processed:[]};};
const save=(s:Store)=>localStorage.setItem(KEY,JSON.stringify(s));
const money=(n:number)=>'TZS '+n.toLocaleString('en-TZ');
const mask=(s:string)=>s.length>4?'•••• '+s.slice(-4):'••••';
const amountOf=(v:string)=>{const n=Number(v);return Number.isSafeInteger(n)&&n>0&&n<=100000000? n:0;};
const id=()=>crypto.randomUUID();
const transactionFee=(amount:number)=>Math.ceil(amount*0.01);
export const generateDemoOtp=()=>String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,'0');
export const DEMO_OTP_LIFETIME_MS=45000;
export function DemoOtpTimer({expires}:{expires:number}){const [seconds,setSeconds]=useState(()=>Math.max(0,Math.ceil((expires-Date.now())/1000)));useEffect(()=>{const update=()=>setSeconds(Math.max(0,Math.ceil((expires-Date.now())/1000)));update();const timer=window.setInterval(update,250);return()=>window.clearInterval(timer);},[expires]);return <p className="pg-otp-hint" role="timer" aria-live="off">{seconds>0?`OTP expires in 00:${String(seconds).padStart(2,'0')}`:'OTP expired — request a new code.'}</p>;}

export function migrateLegacyDemoTopups(userId:string,playgoAccount:string){
 if(!userId||!playgoAccount||userId===playgoAccount)return;
 const store=load();
 const legacy=store.transactions.filter(t=>t.to===userId&&t.kind==='Add Money · Demo'&&t.note.includes('SIMULATED ONLY'));
 if(!legacy.length)return;
 const migrationKey='playgo.demo.topup-migrated.'+userId;
 if(localStorage.getItem(migrationKey)==='1')return;
 const amount=legacy.reduce((total,t)=>total+t.amount,0);
 if(!Number.isSafeInteger(amount)||amount<=0)return;
 const current=store.balances[playgoAccount]||0;
 if(!Number.isSafeInteger(current+amount))return;
 store.balances[playgoAccount]=current+amount;
 store.balances[userId]=Math.max(0,(store.balances[userId]||0)-amount);
 legacy.forEach(t=>{t.to=playgoAccount;});
 save(store);
 localStorage.setItem(migrationKey,'1');
}
export function walletInfo(account:string){const s=load();const fee=s.fees[account]||{total:DEFAULT_FEE,paid:0,due:''};return {balance:s.balances[account]||0,fee,transactions:s.transactions.filter(t=>t.from===account||t.to===account).slice().reverse(),sources:s.sources[account]||[]};}
export function demoLoanOutstanding(account:string):number{try{const loans=JSON.parse(localStorage.getItem('playgo.demo.quick-loan.v1')||'[]') as {account:string;id:string;status:string;totalRepayment?:number;amount:number}[];const s=load();return loans.filter(x=>x.account===account&&x.status==='Demo · Approved (simulation)'&&s.processed.includes('loan-credit:'+x.id)).reduce((sum,x)=>sum+(x.totalRepayment||x.amount),0);}catch{return 0;}}
export function creditApprovedDemoLoan(account:string,loan:{id:string;amount:number}):boolean{
 if(!Number.isSafeInteger(loan.amount)||loan.amount<=0)return false;
 const s=load();const key='loan-credit:'+loan.id;
 if(s.processed.includes(key))return false;
 const balance=s.balances[account]||0;if(!Number.isSafeInteger(balance+loan.amount))return false;
 s.balances[account]=balance+loan.amount;s.processed.push(key);
 s.transactions.push({id:key,kind:'Personal Boost Loan · Demo Credit',amount:loan.amount,from:'Demo loan simulation',to:account,at:new Date().toISOString(),note:'SIMULATED loan principal; repayment liability tracked separately. No real funds disbursed.'});
 save(s);window.dispatchEvent(new Event('playgo:wallet-updated'));return true;
}
export function WalletSummary({account,fullName,institution}:{account:string;fullName:string;institution:string}){const [,refresh]=useState(0);useEffect(()=>{const update=()=>refresh(x=>x+1);window.addEventListener('playgo:wallet-updated',update);return()=>window.removeEventListener('playgo:wallet-updated',update);},[]);const x=walletInfo(account);const outstanding=Math.max(0,x.fee.total-x.fee.paid);return <><div className="pg-account-card pg-unified-wallet-card"><div className="pg-unified-account"><small>PLAYGO ACCOUNT NUMBER</small><h2>{account}</h2><p>{fullName}</p><p>{institution}</p></div><div className="pg-unified-balance"><small>AVAILABLE BALANCE · DEMO</small><h2>{money(x.balance)}</h2><small style={{display:'block',fontSize:12,marginTop:8,opacity:.9}}>Outstanding Personal Boost Loan · {money(-demoLoanOutstanding(account))} (demo liability)</small></div></div><div className="pg-actions"><Link to="/pay-fee">🎓<span>Pay Fee</span></Link><Link to="/transfer-bank">⇄<span>Transfer</span></Link><Link to="/add-money">＋<span>Add Money</span></Link></div><div className="pg-feature-card"><strong>Tuition Fee Overview · Demo</strong><div className="pg-fee-grid"><p>Total fee<b>{money(x.fee.total)}</b></p><p>Paid<b>{money(x.fee.paid)}</b></p><p>Outstanding<b>{money(outstanding)}</b></p><p>Paid percentage<b>{Math.round(x.fee.paid/x.fee.total*100)}%</b></p></div><div className="pg-progress"><div style={{width:`${x.fee.paid/x.fee.total*100}%`}} /></div>{outstanding>0&&<p className="pg-reminder">Reminder: You have an outstanding demo fee balance.</p>}<Link to="/pay-fee">View fee details →</Link></div><History account={account} short /></>}
export function History({account,short=false}:{account:string;short?:boolean}){
 const tx=walletInfo(account).transactions;
 type LoanActivity={id:string;account:string;amount:number;createdAt:string;status:string};
 let loans:LoanActivity[]=[];
 try{const raw:unknown=JSON.parse(localStorage.getItem('playgo.demo.quick-loan.v1')||'[]');if(Array.isArray(raw))loans=(raw as LoanActivity[]).filter(x=>x.account===account&&Number.isFinite(x.amount));}catch{}
 const activities=[
 ...tx.map(t=>({id:t.id,date:t.at,label:t.kind,note:t.note,amount:t.amount,direction:t.to===account?'+':'−',loan:false})),
 ...loans.map(x=>({id:x.id,date:x.createdAt,label:'Personal Boost Loan Request',note:(x.status==='Demo · Checking'&&Date.now()-new Date(x.createdAt).getTime()>=120000?'Demo · Approved (simulation)':x.status)+' · No wallet credit or real loan',amount:x.amount,direction:'',loan:true}))
 ].sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime());
 return <div className="pg-feature-card"><strong>Recent Transactions & Loan Requests</strong>{!activities.length?<p>No demo transactions or loan requests yet.</p>:(short?activities.slice(0,4):activities).map(t=><div className="pg-tx" key={(t.loan?'loan-':'tx-')+t.id}><div><b>{t.label}</b><small>{new Date(t.date).toLocaleString()} · {t.note}</small>{t.loan&&<Link to="/quick-loan">View loan status →</Link>}</div><strong>{t.direction}{money(t.amount)}{t.loan&&<small style={{display:'block',fontWeight:400}}>Requested only</small>}</strong></div>)}{short&&activities.length>4&&<Link to="/history">View all →</Link>}</div>;
}
type Intent={id:string;kind:'fee'|'transfer'|'topup'|'link-mobile'|'link-bank'|'merchant';amount:number;recipient?:string;source?:Source;merchantId?:string;reference?:string};
const PENDING='playgo.demo.transaction.pending.v1';
export function beginMerchantPayment(input:{merchantId:string;amount:number;reference:string},navigate:(path:string)=>void){begin({id:id(),kind:'merchant',amount:input.amount,merchantId:input.merchantId,reference:input.reference},navigate);}
function begin(i:Intent,navigate:(path:string)=>void){sessionStorage.setItem('playgo.demo.transaction-otp',JSON.stringify({code:generateDemoOtp(),expires:Date.now()+DEMO_OTP_LIFETIME_MS}));sessionStorage.setItem(PENDING,JSON.stringify(i));navigate('/transaction-otp');}
function Section({title,children}:{title:string;children:React.ReactNode}){return <><Link className="pg-back" to="/dashboard">← Back to Home</Link><h1>{title}</h1>{children}</>}
export function FeePage({account}:{account:string}){const navigate=useNavigate();const [amount,setAmount]=useState('');const [error,setError]=useState('');const [edit,setEdit]=useState(false);const [total,setTotal]=useState(String(walletInfo(account).fee.total));const [due,setDue]=useState(walletInfo(account).fee.due);const {fee,balance}=walletInfo(account);const outstanding=fee.total-fee.paid;function submit(e:FormEvent){e.preventDefault();const n=amountOf(amount);if(!n||n>outstanding||n>balance){setError('Enter an amount within your outstanding fee and wallet balance.');return;}begin({id:id(),kind:'fee',amount:n},navigate);}function configure(e:FormEvent){e.preventDefault();const n=amountOf(total);if(!n||n<fee.paid){setError('Total must be positive and not below amount already paid.');return;}const s=load();s.fees[account]={total:n,paid:fee.paid,due};save(s);setEdit(false);setError('');}return <Section title="Pay Tuition Fee"><p>Institution fee tracking is a local demonstration, not official university data.</p><div className="pg-feature-card"><div className="pg-fee-grid"><p>Total Fee<b>{money(fee.total)}</b></p><p>Paid<b>{money(fee.paid)}</b></p><p>Outstanding<b>{money(outstanding)}</b></p><p>Paid<b>{Math.round(fee.paid/fee.total*100)}%</b></p></div><div className="pg-progress"><div style={{width:`${fee.paid/fee.total*100}%`}} /></div>{fee.due&&<p>Due date: {fee.due}</p>}{outstanding>0&&<p className="pg-reminder">Reminder: Fee balance is outstanding.</p>}<button className="pg-text-button" onClick={()=>setEdit(!edit)}>Configure demo fee</button>{edit&&<form className="pg-form" onSubmit={configure}><label>Total Fee (TZS)</label><input type="number" min="1" value={total} onChange={e=>setTotal(e.target.value)} required/><label>Due Date (optional)</label><input type="date" value={due} onChange={e=>setDue(e.target.value)}/><button className="pg-button">Save Demo Fee</button></form>}</div><form className="pg-form" onSubmit={submit}><p>Wallet available: <b>{money(balance)}</b></p><label>Amount to Pay (TZS)</label><input type="number" min="1" step="1" value={amount} onChange={e=>setAmount(e.target.value)} required/><button className="pg-button" disabled={!outstanding}>Review & Verify OTP →</button>{error&&<p className="pg-error" role="alert">{error}</p>}</form><History account={account}/></Section>}
export function TransferPage({account,findAccount}:{account:string;findAccount:(n:string)=>string|undefined}){const navigate=useNavigate();const [to,setTo]=useState('');const [amount,setAmount]=useState('');const [error,setError]=useState('');const recipient=findAccount(to);function submit(e:FormEvent){e.preventDefault();const n=amountOf(amount);if(!/^09\d{8}$/.test(to)||!recipient||to===account||!n||n>walletInfo(account).balance){setError('Check recipient account, amount, and available balance.');return;}begin({id:id(),kind:'transfer',amount:n,recipient:to},navigate);}return <Section title="Transfer"><p>Send demo wallet funds to another student account saved in this browser.</p><form className="pg-form" onSubmit={submit}><label>Recipient PlayGo Account</label><input inputMode="numeric" maxLength={10} placeholder="09XXXXXXXX" value={to} onChange={e=>setTo(e.target.value.replace(/\D/g,''))} required/>{recipient&&<p>Recipient: <b>{recipient}</b></p>}<label>Amount (TZS)</label><input type="number" min="1" step="1" value={amount} onChange={e=>setAmount(e.target.value)} required/><p>Available: {money(walletInfo(account).balance)}</p><button className="pg-button">Review & Verify OTP →</button>{error&&<p className="pg-error" role="alert">{error}</p>}</form></Section>}
export function BankTransferPage({account,supabase,userId}:{account:string;supabase:SupabaseClient;userId:string}){
 const navigate=useNavigate();
 const [bank,setBank]=useState<{account_holder:string;account_number:string}|null>(null);
 const [loading,setLoading]=useState(true);const [amount,setAmount]=useState('');const [error,setError]=useState('');const [success,setSuccess]=useState('');const [review,setReview]=useState(false);const [otp,setOtp]=useState('');const [otpChallenge,setOtpChallenge]=useState<{code:string;expires:number}|null>(null);
 useEffect(()=>{let active=true;void supabase.from('pg_nmb_demo_links').select('account_holder,account_number').eq('user_id',userId).maybeSingle().then(({data,error:e})=>{if(active){setLoading(false);if(e)setError('Unable to load linked NMB account.');else setBank(data);}});return()=>{active=false;};},[supabase,userId]);
 const balance=walletInfo(account).balance;const n=Number(amount);const fee=Number.isSafeInteger(n)&&n>0?transactionFee(n):0;const total=n+fee;
 function confirm(){if(!otpChallenge||Date.now()>otpChallenge.expires||otp!==otpChallenge.code){setError('Invalid or expired demo OTP. Generate a new code and retry.');return;}if(!bank||!Number.isSafeInteger(n)||n<=0||total>balance){setError('Insufficient demo balance.');return;}try{const store=load();if(total>(store.balances[account]||0))throw Error('Balance');store.balances[account]-=total;const receipt:Tx={id:id(),kind:'Bank Transfer · Demo',amount:n,from:account,to:'NMB '+mask(bank.account_number),at:new Date().toISOString(),note:'Demo only; no bank transfer. Transaction fee (1%): '+money(fee)+'. Total debited: '+money(total)};store.transactions.push(receipt);save(store);sessionStorage.setItem('playgo.demo.receipt.v1',JSON.stringify(receipt));navigate('/transaction-status',{replace:true});setSuccess('Demo transfer recorded. Total debited: '+money(total)+' including '+money(fee)+' fee. No real funds moved.');setReview(false);setOtp('');setOtpChallenge(null);}catch{setError('Unable to save demo transfer.');}}
 return <Section title="Transfer to Bank">{loading?<p>Loading linked bank…</p>:!bank?<p>No linked NMB account. <Link to="/profile">Link bank in Profile →</Link></p>:<div className="pg-feature-card"><p>Linked NMB: {bank.account_holder} · {mask(bank.account_number)}</p><p>Available demo balance: {money(balance)}</p><form className="pg-form" onSubmit={e=>{e.preventDefault();if(!Number.isSafeInteger(n)||n<=0||total>balance){setError('Enter an amount including the 1% fee within your demo balance.');return;}setError('');setOtp('');setOtpChallenge({code:generateDemoOtp(),expires:Date.now()+DEMO_OTP_LIFETIME_MS});setReview(true);}}><label>Amount (TZS)</label><input type="number" min="1" step="1" max={balance} value={amount} onChange={e=>{setAmount(e.target.value);setReview(false);}} required/>{Number.isSafeInteger(n)&&n>0&&<div className="pg-details" aria-live="polite"><p><strong>Transfer amount</strong><span>{money(n)}</span></p><p><strong>Transaction fee (1%)</strong><span>{money(fee)}</span></p><p><strong>Total deducted</strong><span>{money(total)}</span></p></div>}<button className="pg-button">Review Demo Transfer</button></form>{review&&<div><p>Transfer: {money(n)} · Fee (1%): {money(fee)} · Total wallet debit: {money(total)}. Confirm to linked NMB account?</p><p className="pg-otp-hint">Demo OTP: <strong>{otpChallenge?.code}</strong> · Valid for 45 seconds. No SMS is sent.</p>{otpChallenge&&<DemoOtpTimer expires={otpChallenge.expires}/>}<label htmlFor="bank-transfer-otp">Enter 6-digit OTP</label><input id="bank-transfer-otp" inputMode="numeric" maxLength={6} pattern="[0-9]{6}" value={otp} onChange={e=>setOtp(e.target.value.replace(/[^0-9]/g,'').slice(0,6))}/><button type="button" className="pg-button" onClick={confirm} disabled={otp.length!==6||!otpChallenge}>Verify OTP & Confirm Transfer</button></div>}</div>}{error&&<p role="alert">{error}</p>}{success&&<p role="status">{success}</p>}<p className="pg-note">Simulation only. No real NMB transfer.</p></Section>;
}
export function AddMoneyPage({account,supabase,userId}:{account:string;supabase:SupabaseClient;userId:string}){
 const [method,setMethod]=useState<'bank'|'borrow'>('bank');
 const [bank,setBank]=useState<{account_holder:string;account_number:string}|null>(null);
 const [loadingBank,setLoadingBank]=useState(true);
 useEffect(()=>{let live=true;void supabase.from('pg_nmb_demo_links').select('account_holder,account_number').eq('user_id',userId).maybeSingle().then(({data,error:e})=>{if(!live)return;setLoadingBank(false);if(e)setError('Cannot load linked bank.');else setBank(data);});return()=>{live=false;};},[supabase,userId]);
 const [amount,setAmount]=useState('');
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [review,setReview]=useState<{amount:number;provider:string;number:string}|null>(null);
 const [balance,setBalance]=useState(()=>walletInfo(account).balance);
 const [otp,setOtp]=useState('');const [otpChallenge,setOtpChallenge]=useState<{code:string;expires:number}|null>(null);
 function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setError('');setMessage('');setReview(null);
  const n=amountOf(amount);
  if(!n||n>5000000){setError('Enter a valid demo amount between TZS 1 and TZS 5,000,000.');return;}
  if(!bank){setError('Link NMB account in Profile first.');return;}
  setOtp('');setOtpChallenge({code:generateDemoOtp(),expires:Date.now()+DEMO_OTP_LIFETIME_MS});setReview({amount:n,provider:'NMB Bank',number:bank.account_number});
 }
 function confirmDemoTopup(){if(!review)return;setError('');if(!otpChallenge||Date.now()>otpChallenge.expires||otp!==otpChallenge.code){setError('Invalid or expired demo OTP. Generate a new code and retry.');return;}try{
  const store=load();const previous=store.balances[account]||0;
  const fee=transactionFee(review.amount);const credited=review.amount-fee;
  if(!Number.isSafeInteger(previous+credited))throw Error('Invalid balance');
  const txId=id();store.balances[account]=previous+credited;
  store.transactions.push({id:txId,kind:'Add Money · Demo',amount:review.amount,from:review.provider+' · '+mask(review.number),to:account,at:new Date().toISOString(),note:'SIMULATED ONLY · No external funds debited. Transaction fee (1%): '+money(fee)+'. Net credited: '+money(credited)});
  store.processed.push(txId);save(store);setBalance(store.balances[account]);setMessage('Demo top-up completed. Credited '+money(credited)+' after '+money(fee)+' fee (1%). No real money was transferred.');setReview(null);setAmount('');setOtp('');setOtpChallenge(null);
 }catch{setError('Could not save the simulated top-up.');}}
 return <Section title="Add Money">
 <p>Choose a demo funding method. Linked NMB bank top-ups update only your simulated wallet balance.</p><div className="pg-feature-card"><strong>Available demo balance: {money(balance)}</strong><p className="pg-note">Demo funds are not real money and cannot be withdrawn.</p></div>
 <div className="pg-services-grid"><button type="button" className="pg-service-tile" onClick={()=>{setMethod('bank');setReview(null);setOtpChallenge(null);}}><strong>Linked NMB Bank</strong></button><button type="button" className="pg-service-tile" onClick={()=>{setMethod('borrow');setReview(null);setOtpChallenge(null);}}><strong>Borrow</strong></button></div>
 {method==='borrow'?<div className="pg-feature-card"><h2>Personal Boost Loan</h2><p>Request a short-term student loan and see the automatically calculated interest and total repayment before submitting.</p><p className="pg-note">Loan disbursement and automatic wallet top-up are not available in demo mode.</p><Link className="pg-button" to="/quick-loan">Continue to Personal Boost →</Link></div>:
 <form className="pg-form pg-feature-card" onSubmit={submit}>
 <h2>Top up from Linked NMB Bank</h2>{loadingBank?<p>Loading bank…</p>:!bank?<p>No linked bank. <Link to="/profile">Link NMB in Profile →</Link></p>:<p>{bank.account_holder} · {mask(bank.account_number)}</p>}
 <label htmlFor="pg-topup-amount">Amount (TZS)</label><input id="pg-topup-amount" type="number" min="1" max="5000000" step="1" placeholder="Enter amount" value={amount} onChange={e=>setAmount(e.target.value)} required/>
 {amountOf(amount)>0&&<div className="pg-details" aria-live="polite"><p><strong>Top-up amount</strong><span>{money(amountOf(amount))}</span></p><p><strong>Transaction fee (1%)</strong><span>{money(transactionFee(amountOf(amount)))}</span></p><p><strong>Net wallet credit</strong><span>{money(amountOf(amount)-transactionFee(amountOf(amount)))}</span></p></div>}<button className="pg-button" type="submit" disabled={!bank||loadingBank}>Review Demo Top-Up →</button>
 {review&&<div className="pg-feature-card" role="status"><h3>Confirm simulated top-up</h3><p><strong>Amount:</strong> {money(review.amount)}</p><p><strong>Fee (1%):</strong> {money(transactionFee(review.amount))}</p><p><strong>Net wallet credit:</strong> {money(review.amount-transactionFee(review.amount))}</p><p><strong>Source:</strong> {review.provider} · {mask(review.number)}</p><p>No charge will be made to this source. Only your local demo balance will increase.</p><p className="pg-otp-hint">Demo OTP: <strong>{otpChallenge?.code}</strong> · Valid for 45 seconds. No SMS is sent.</p>{otpChallenge&&<DemoOtpTimer expires={otpChallenge.expires}/>}<label htmlFor="bank-topup-otp">Enter 6-digit OTP</label><input id="bank-topup-otp" inputMode="numeric" maxLength={6} pattern="[0-9]{6}" value={otp} onChange={e=>setOtp(e.target.value.replace(/[^0-9]/g,'').slice(0,6))}/><button className="pg-button" type="button" onClick={confirmDemoTopup} disabled={otp.length!==6||!otpChallenge}>Verify OTP & Add Money</button><button className="pg-button pg-outline" type="button" onClick={()=>{setReview(null);setOtpChallenge(null);}}>Cancel</button></div>}{error&&<p className="pg-error" role="alert">{error}</p>}{message&&<p className="pg-services-message" role="status">{message}</p>}
 <p className="pg-note">Confirming increases your local demo wallet balance and creates a demo transaction record. No bank or mobile-money account is debited. Never enter a PIN or password.</p>
 </form>}
 </Section>;
}
export function LinkedAccounts({account, supabase, userId}:{account:string;supabase?:SupabaseClient;userId?:string}){
 const [step,setStep]=useState<'form'|'otp'|'checking'|'card'>('form');
 const [holder,setHolder]=useState('');
 const [bankNumber,setBankNumber]=useState('');
 const [mobile,setMobile]=useState('');
 const [otp,setOtp]=useState('');
 const [demoOtp,setDemoOtp]=useState('');const [bankOtpExpires,setBankOtpExpires]=useState(0);
 const [revealed,setRevealed]=useState(false);
 const [error,setError]=useState('');
 const [progress,setProgress]=useState(0);
 const [loadingSaved,setLoadingSaved]=useState(!!supabase && !!userId);
 const [saving,setSaving]=useState(false);
 useEffect(()=>{if(!supabase||!userId)return;let active=true;void supabase.from('pg_nmb_demo_links').select('account_holder,account_number,mobile_number').eq('user_id',userId).maybeSingle().then(({data,error:loadError})=>{if(!active)return;setLoadingSaved(false);if(loadError){setError('Could not load saved NMB demo details: '+loadError.message);return;}if(data){setHolder(data.account_holder);setBankNumber(data.account_number);setMobile(data.mobile_number);setStep('card');}});return()=>{active=false;};},[supabase,userId]);
 const masked=(value:string)=>'•••• •••• '+value.slice(-4);
 function requestOtp(e:FormEvent<HTMLFormElement>){
   e.preventDefault();setError('');
   const digits=bankNumber.replace(/\D/g,'');
   const phone=mobile.replace(/[\s-]/g,'');
   if(holder.trim().length<2||holder.trim().length>120){setError('Enter the account holder name.');return;}
   if(!/^[0-9]{6,24}$/.test(digits)){setError('Enter a valid bank account number format.');return;}
   if(!/^(?:0[67]\d{8}|\+?255[67]\d{8})$/.test(phone)){setError('Enter a valid Tanzanian mobile number.');return;}
   setBankNumber(digits);setMobile(phone);setDemoOtp(generateDemoOtp());setBankOtpExpires(Date.now()+DEMO_OTP_LIFETIME_MS);setOtp('');setStep('otp');
 }
 async function confirmOtp(e:FormEvent<HTMLFormElement>){
   e.preventDefault();setError('');
   if(Date.now()>=bankOtpExpires||otp!==demoOtp){setError('Demo OTP expired or incorrect. Return to details to request a new one.');return;}
   if(!supabase||!userId){setError('Sign in to save the NMB demo details.');return;}
   setSaving(true);setProgress(35);setStep('checking');
   const {error:saveError}=await supabase.from('pg_nmb_demo_links').upsert({user_id:userId,account_holder:holder.trim(),account_number:bankNumber,mobile_number:mobile,status:'demo_pending_real_verification',updated_at:new Date().toISOString()},{onConflict:'user_id'});
   setSaving(false);
   if(saveError){setError('Database save failed: '+saveError.message);setStep('otp');return;}
   setProgress(100);setStep('card');setOtp('');setDemoOtp('');
 }
 async function reset(){if(supabase&&userId){setSaving(true);const {error:deleteError}=await supabase.from('pg_nmb_demo_links').delete().eq('user_id',userId);setSaving(false);if(deleteError){setError('Could not remove saved demo details: '+deleteError.message);return;}}setStep('form');setHolder('');setBankNumber('');setMobile('');setOtp('');setDemoOtp('');setError('');setProgress(0);setRevealed(false);}
 return <div className="pg-feature-card" style={{minWidth:0}}>
   <h2>NMB Bank Account</h2>
   <p className="pg-note">NMB Bank Plc is the only designated bank. This is a demonstration; real account ownership, OTP delivery and NMB connectivity are not verified. Do not use your actual bank account details for testing.</p>
   {loadingSaved&&<p>Loading saved NMB demo account…</p>}
   {!loadingSaved&&step==='form'&&<form className="pg-form" onSubmit={requestOtp}>
     <label htmlFor="nmb-holder">Account holder name</label><input id="nmb-holder" required maxLength={120} autoComplete="off" value={holder} onChange={e=>setHolder(e.target.value)} placeholder="Test account holder"/>
     <label htmlFor="nmb-account">NMB account number (test data only)</label><input id="nmb-account" required inputMode="numeric" autoComplete="off" value={bankNumber} onChange={e=>setBankNumber(e.target.value)} placeholder="Enter fictional account number"/>
     <label htmlFor="nmb-phone">Mobile number (test data only)</label><input id="nmb-phone" required type="tel" autoComplete="off" value={mobile} onChange={e=>setMobile(e.target.value)} placeholder="07XXXXXXXX"/>
     <button className="pg-button" type="submit">Continue to OTP Demo →</button>
     {error&&<p className="pg-error" role="alert">{error}</p>}
   </form>}
   {!loadingSaved&&step==='otp'&&<><h3>Confirm bank linking</h3><p>Step 2 of 3 · OTP demonstration</p><p className="pg-note">No SMS has been sent. Enter the test code shown below. This does not prove account ownership.</p><div className="pg-details"><p><strong>Demo OTP</strong><span style={{fontVariantNumeric:'tabular-nums'}}>{demoOtp}</span></p><p><strong>Mobile</strong><span>{masked(mobile)}</span></p></div><DemoOtpTimer expires={bankOtpExpires}/><form className="pg-form" onSubmit={confirmOtp}><label htmlFor="nmb-otp">Six-digit demonstration code</label><input id="nmb-otp" required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="off" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}/><button className="pg-button" type="submit">Confirm Demo OTP →</button>{error&&<p className="pg-error" role="alert">{error}</p>}</form><button className="pg-button pg-outline" type="button" onClick={()=>setStep('form')}>Back to details</button></>}
   {!loadingSaved&&step==='checking'&&<div aria-live="polite"><h3>Checking demo details…</h3><div role="progressbar" aria-label="Demo linking progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} style={{height:10,borderRadius:8,background:'#eee',overflow:'hidden'}}><div style={{width:progress+'%',height:'100%',background:'#c93333',transition:'width .4s'}}/></div><p>{progress}% · {progress<70?'Checking demonstration OTP…':progress<100?'Preparing preview card…':'Preview ready'}</p></div>}
   {!loadingSaved&&step==='card'&&<><div style={{borderRadius:18,background:'#183d32',color:'#fff',padding:20,margin:'16px 0',minWidth:0,overflow:'hidden'}}>
     <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}}><strong style={{fontSize:19}}>NMB</strong><span style={{fontSize:11}}>DEMO · NOT CONNECTED</span></div>
     <p style={{fontSize:11,opacity:.8,marginTop:18}}>NMB Account Number</p>
     <strong style={{fontSize:'clamp(16px,4.2vw,22px)',letterSpacing:1,overflowWrap:'anywhere',fontVariantNumeric:'tabular-nums'}}>{revealed?bankNumber:masked(bankNumber)}</strong>
     <p style={{fontSize:13,margin:'20px 0 3px'}}>{holder}</p><p style={{fontSize:11,opacity:.8,margin:0}}>PlayGo · {account}</p>
   </div>
   <button className="pg-button pg-outline" type="button" onClick={()=>setRevealed(v=>!v)}>{revealed?'Hide account number':'Show account number'}</button>
   <p className="pg-note">Demo preview only. No NMB account has been verified. These test details are saved privately in PlayGo Supabase and can be deleted before real NMB integration.</p>
   <button className="pg-button pg-outline" type="button" onClick={()=>void reset()} disabled={saving}>Delete saved demo details</button></>}
 </div>;
}
export function TransactionOtp({account,findAccount}:{account:string;findAccount:(n:string)=>string|undefined}){const navigate=useNavigate();const [code,setCode]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [challenge,setChallenge]=useState<{code:string;expires:number}|null>(()=>{try{return JSON.parse(sessionStorage.getItem('playgo.demo.transaction-otp')||'null');}catch{return null;}});const raw=sessionStorage.getItem(PENDING);let intent:Intent|null=null;try{intent=raw?JSON.parse(raw) as Intent:null;}catch{}if(!intent)return <Navigate to="/dashboard" replace/>;const current=intent;const labels:{[key:string]:string}={fee:'Tuition Fee Payment',transfer:'Student Transfer',topup:'Add Money','link-mobile':'Link Mobile Money','link-bank':'Link Bank Account',merchant:'Merchant Payment'};function submit(e:FormEvent){e.preventDefault();if(busy)return;if(!challenge||Date.now()>=challenge.expires||code!==challenge.code){setError('OTP incorrect or expired. Restart the transaction for a new code.');return;}setBusy(true);try{const s=load();if(s.processed.includes(current.id))throw Error('Already processed.');const balance=s.balances[account]||0;const fee=s.fees[account]||{total:DEFAULT_FEE,paid:0,due:''};const n=current.amount;let to='';let note='';if(current.kind==='fee'){if(!amountOf(String(n))||n>balance||n>fee.total-fee.paid)throw Error('Insufficient balance or invalid fee amount.');s.balances[account]=balance-n;s.fees[account]={...fee,paid:fee.paid+n};to='Institution fee';note='Demo tuition payment';}else if(current.kind==='transfer'){to=current.recipient||'';if(!findAccount(to)||to===account||!amountOf(String(n))||n>balance)throw Error('Recipient or balance invalid.');s.balances[account]=balance-n;s.balances[to]=(s.balances[to]||0)+n;note='Demo student transfer';}else if(current.kind==='merchant'){const merchantIds=['PGM1001','PGM1002','PGM1003','PGM1004','PGM1005'];if(!current.merchantId||!merchantIds.includes(current.merchantId)||!amountOf(String(n))||n>balance)throw Error('Invalid merchant payment or insufficient wallet balance.');s.balances[account]=balance-n;to=current.merchantId;note=`Demo merchant payment${current.reference?' · '+current.reference:''}`;}else if(current.kind==='topup'){if(!current.source||(s.sources[account]||[]).every(x=>x.id!==current.source!.id)||!amountOf(String(n)))throw Error('Funding source unavailable.');s.balances[account]=balance+n;to=account;note=`Demo funding via ${current.source.provider}`;}else{if(!current.source)throw Error('Account details missing.');const existing=s.sources[account]||[];if(existing.some(x=>x.number===current.source!.number&&x.kind===current.source!.kind))throw Error('Account already linked.');s.sources[account]=[...existing,current.source];note=`Demo linked ${current.source.provider}`;}s.processed.push(current.id);const tx:Tx={id:current.id,kind:labels[current.kind],amount:n,from:account,to,at:new Date().toISOString(),note};s.transactions.push(tx);save(s);sessionStorage.removeItem(PENDING);sessionStorage.removeItem('playgo.demo.transaction-otp');sessionStorage.setItem('playgo.demo.receipt.v1',JSON.stringify(tx));navigate('/transaction-status',{replace:true});}catch(e){setBusy(false);setError(e instanceof Error?e.message:'Unable to complete demo operation.');}}return <Section title="OTP Verification"><p>Confirm: <b>{labels[current.kind]}</b></p>{current.amount>0&&<p>Amount: <b>{money(current.amount)}</b></p>}{current.recipient&&<p>Recipient: {current.recipient}</p>}{current.merchantId&&<p>Merchant ID: {current.merchantId}</p>}{current.source&&<p>Source: {current.source.provider} · {mask(current.source.number)}</p>}<div className="pg-otp-hint">Demo OTP: <strong>{challenge?.code||"Unavailable"}</strong> · No SMS is sent.</div>{challenge&&<DemoOtpTimer expires={challenge.expires}/>}<form className="pg-form" onSubmit={submit}><label>Six-digit OTP</label><input inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" required value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))}/><button className="pg-button" disabled={busy}>{busy?'Processing…':'Verify & Confirm →'}</button><button className="pg-button pg-outline" type="button" onClick={()=>{sessionStorage.removeItem(PENDING);navigate('/dashboard',{replace:true});}}>Cancel</button><button type="button" className="pg-text-button" onClick={()=>{const next={code:generateDemoOtp(),expires:Date.now()+DEMO_OTP_LIFETIME_MS};sessionStorage.setItem('playgo.demo.transaction-otp',JSON.stringify(next));setChallenge(next);setCode('');setError('New demo OTP generated.');}}>Resend demo OTP</button>{error&&<p className="pg-error" role="alert">{error}</p>}</form></Section>}
export function TransactionStatus({account}:{account:string}){const raw=sessionStorage.getItem('playgo.demo.receipt.v1');let tx:Tx|null=null;try{tx=raw?JSON.parse(raw) as Tx:null;}catch{}if(!tx||tx.from!==account)return <Navigate to="/dashboard" replace/>;return <Section title="Demo Successful"><div className="pg-success"><h2>✓ Transaction completed</h2><p><b>{tx.kind}</b></p><p>Amount: {money(tx.amount)}</p><p>Reference: {tx.id}</p><p>Date: {new Date(tx.at).toLocaleString()}</p><p>From: {tx.from}</p>{tx.to&&<p>To: {tx.to}</p>}<p>Current balance: <b>{money(walletInfo(account).balance)}</b></p></div><Link className="pg-button" to="/dashboard">Back to Home</Link><Link className="pg-button pg-outline" to="/history">View History</Link><p className="pg-note">No real money moved. This is a local demo receipt.</p></Section>}
