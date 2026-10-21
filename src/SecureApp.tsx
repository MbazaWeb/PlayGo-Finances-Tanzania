import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { createClient, type Session } from '@supabase/supabase-js';
import './styles.css';
import AdminPortal from './AdminPortal';
import AdminLogin from './AdminLogin';
import InstitutionPortal, {InstitutionLogin} from './InstitutionPortal';
import StudentInstitutionRequest from './StudentInstitutionRequest';
import { MerchantPage } from './Merchant';
import { ServicesPage, GovernmentStudentLoan } from './Services';
import { SecureQuickLoan } from './SecureQuickLoan';
import { WalletSummary, LinkedAccounts, AddMoneyPage, BankTransferPage, TransactionStatus, History, TransactionOtp, DemoOtpTimer, DEMO_OTP_LIFETIME_MS, generateDemoOtp, migrateLegacyDemoTopups } from './Wallet';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const supabase = url && key ? createClient(url, key, { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } }) : null;
const logo = '/branding/playgo-white.png';

type Profile = { user_id: string; full_name: string; playgo_account: string | null };
type Enrollment = { id: string; institution_id: string; admission_number: string; active: boolean };
type Institution = { id: string; name: string };
type Year = { id: string; institution_id: string; label: string; structure: string };
type Installment = { id: string; academic_year_id: string; installment_number: number; amount_tzs: number; due_date: string };

function Frame({ children }: { children: React.ReactNode }) { return <main className="pg-page"><section className="pg-panel"><div className="pg-subpage-brand"><img className="pg-logo pg-small" src={logo} alt="PlayGo"/></div>{children}<footer className="pg-demo-footer">Demo App</footer></section></main>; }
function Splash() {
  const navigate = useNavigate();
  useEffect(() => {
    const timer = window.setTimeout(() => navigate('/welcome', { replace: true }), 1800);
    return () => window.clearTimeout(timer);
  }, [navigate]);
  return <main className="pg-center"><img className="pg-logo" src={logo} alt="PlayGo Tanzania Limited" /><div className="pg-loader" aria-label="Loading" /></main>;
}
function Welcome() {
  return <main className="pg-center pg-welcome"><img className="pg-logo" src={logo} alt="PlayGo Tanzania Limited" /><p className="pg-eyebrow">PLAYGO FINANCES</p><h1>Finance for student life.</h1><p>A simpler way to manage your student finances.</p><Link className="pg-button" to="/login">Get Started →</Link><small>Powered by Global Student System</small></main>;
}
function AuthForm({ register }: { register: boolean }) {
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [registrationPercent, setRegistrationPercent] = useState(0); const [registrationCheck, setRegistrationCheck] = useState(''); const [checking, setChecking] = useState(false); const [registrationFailure, setRegistrationFailure] = useState(''); const [otpStep, setOtpStep] = useState(false); const [demoCode, setDemoCode] = useState(''); const [demoOtpExpires,setDemoOtpExpires]=useState(0); const [enteredCode, setEnteredCode] = useState(''); const [draft, setDraft] = useState<Record<string,string> | null>(null); const navigate = useNavigate();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!supabase) return;
    const d = otpStep && draft ? new FormData() : new FormData(e.currentTarget);
    if (otpStep && draft) Object.entries(draft).forEach(([k,v]) => d.set(k,v));
    const email = String(d.get('email') || '').trim().toLowerCase();
    const password = String(d.get('password') || '');
    const fullName = String(d.get('fullName') || '').trim();
    const institution = String(d.get('institution') || '').trim();
    const admissionNumber = String(d.get('admissionNumber') || '').trim();
    const phone = String(d.get('phone') || '').replace(/[\s-]/g, '');
    if (register) {
      if (fullName.length < 2 || fullName.length > 120 || !institution || !admissionNumber) { setMessage('Complete your name, institution and admission number.'); return; }
      if (!/^(?:0[67]\d{8}|\+?255[67]\d{8})$/.test(phone)) { setMessage('Enter a valid Tanzanian mobile number.'); return; }
      if (password !== String(d.get('confirmPassword') || '')) { setMessage('Passwords do not match.'); return; }
    }
    if (register && !otpStep) { const code = generateDemoOtp(); setDemoCode(code);setDemoOtpExpires(Date.now()+DEMO_OTP_LIFETIME_MS); setEnteredCode(''); setDraft(Object.fromEntries(d.entries()) as Record<string,string>); setOtpStep(true); setMessage(''); return; }
    if (register && (enteredCode !== demoCode || !draft || Date.now()>=demoOtpExpires)) { setMessage('Incorrect or expired demonstration code. Request a new code.'); return; }
    setBusy(true); setChecking(register); setRegistrationFailure(''); setMessage(''); setRegistrationPercent(10); setRegistrationCheck('Checking selected university in PlayGo directory…');
    try {
      if (register) {
        const institutionCheck = await supabase.from('pg_institutions').select('id,name').eq('name',institution).maybeSingle();
        if (institutionCheck.error) throw new Error('University directory check failed: ' + institutionCheck.error.message);
        if (!institutionCheck.data) throw new Error('Selected university does not exist in the PlayGo directory. Registration stopped.');
        setRegistrationPercent(35); setRegistrationCheck('University found. Checking student registration information…');
        await new Promise(resolve => setTimeout(resolve, 650));
        if (!admissionNumber || admissionNumber.length < 3) throw new Error('Enter a valid admission number.');
        setRegistrationPercent(55); setRegistrationCheck('Student number recorded as unverified. Creating login…');
        await new Promise(resolve => setTimeout(resolve, 650));
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName, institution_requested: institution, admission_number_requested: admissionNumber, phone_requested: phone } }
        });
        if (error) throw error;
        if (data.session) { setRegistrationPercent(85); setRegistrationCheck('Login created. Verifying profile and account number…'); await new Promise(resolve => setTimeout(resolve, 650)); navigate('/registration-success', { replace: true }); }
        else setMessage('Account created. Log in to continue. If confirmation is required by Supabase, follow its instructions.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/dashboard', { replace: true });
      }
    } catch (err) { const reason = err instanceof Error ? err.message : 'Authentication failed.'; setMessage(reason); setRegistrationFailure(reason); } finally { setBusy(false); }
  }
  if (register && checking) return <Frame><p className="pg-eyebrow">REGISTRATION VERIFICATION · STEP 3 OF 3</p><h1>{registrationFailure ? 'Registration check failed' : 'Checking your registration…'}</h1><div role="progressbar" aria-label="Registration progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={registrationPercent} style={{height:16,borderRadius:12,background:'#eee',overflow:'hidden',margin:'18px 0'}}><div style={{height:'100%',width:registrationPercent+'%',background:'#d32f2f',transition:'width .4s ease'}}/></div><h2>{registrationPercent}%</h2><p aria-live="polite">{registrationCheck}</p><div className="pg-details"><p><strong>{registrationPercent>=10?'✓':'○'} OTP Verification</strong><span>Test only</span></p><p><strong>{registrationPercent>=35?'✓':'○'} University directory</strong><span>{registrationPercent>=35?'Found':'Checking'}</span></p><p><strong>{registrationPercent>=55?'✓':'○'} Admission number format</strong><span>{registrationPercent>=55?'Recorded, not university verified':'Pending'}</span></p><p><strong>{registrationPercent>=85?'✓':'○'} Account creation</strong><span>{registrationPercent>=85?'Created':'Pending'}</span></p></div>{registrationFailure && <><p role="alert" className="pg-error">{registrationFailure}</p><button className="pg-button pg-outline" type="button" onClick={()=>{setChecking(false);setRegistrationFailure('');}}>Back to OTP</button></>}</Frame>;
  if (register && otpStep) return <Frame><h1>OTP Verification</h1><p>Step 2 of 3 — Enter the verification code to continue.</p><div className="pg-details"><p><strong>Verification code</strong><span style={{fontSize:24,letterSpacing:3}}>{demoCode}</span></p></div><DemoOtpTimer expires={demoOtpExpires}/><form className="pg-form" onSubmit={submit}><label htmlFor="demo-otp">Enter the 6-digit demo code</label><input id="demo-otp" type="text" inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" maxLength={6} value={enteredCode} onChange={e=>setEnteredCode(e.target.value.replace(/[^0-9]/g,'').slice(0,6))} required/><button className="pg-button" disabled={busy}>{busy ? 'Creating account…' : 'Confirm demo code & create account'}</button>{registrationPercent > 0 && <div aria-live="polite"><p><strong>{registrationPercent}%</strong> — {registrationCheck}</p><div role="progressbar" aria-valuenow={registrationPercent} aria-valuemin={0} aria-valuemax={100} style={{height:12,background:'#eee',borderRadius:8,overflow:'hidden'}}><div style={{width:registrationPercent+'%',height:'100%',background:'#d32f2f',transition:'width .3s'}} /></div></div>}{message && <p role="alert">{message}</p>}</form><button className="pg-button pg-outline" type="button" disabled={busy} onClick={()=>{setOtpStep(false);setDraft(null);setDemoOtpExpires(0);setMessage('');}}>Back to registration</button></Frame>;
  return <Frame><h1>{register ? 'Create student account' : 'Student Login'}</h1><p>{register ? 'Step 1 of 3 — Enter student details. The next step is OTP verification.' : 'Use your email address and password. Use your account password.'}</p>
    <form className="pg-form" onSubmit={submit}>
      {register && <>
        <label htmlFor="fullName">Full name</label><input id="fullName" name="fullName" autoComplete="name" minLength={2} maxLength={120} required />
        <label htmlFor="institution">University / College / Institution (Iringa Region)</label><select id="institution" name="institution" defaultValue="" required><option value="" disabled>Select your university</option><option value="University of Iringa (UoI)">University of Iringa (UoI)</option><option value="Ruaha Catholic University (RUCU)">Ruaha Catholic University (RUCU)</option><option value="Mkwawa University College of Education (MUCE)">Mkwawa University College of Education (MUCE)</option><option value="Open University of Tanzania (OUT) - Iringa Centre">Open University of Tanzania (OUT) — Iringa Centre</option></select>
        <label htmlFor="admissionNumber">Admission / Registration number</label><input id="admissionNumber" name="admissionNumber" maxLength={80} required />
        <label htmlFor="phone">Mobile number (Tanzania)</label><input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="07XXXXXXXX" required />
      </>}
      <label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" required />
      <label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={8} required />
      {register && <><label htmlFor="confirmPassword">Confirm password</label><input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required /><p className="pg-note">Your institution and admission number are pending verification. Do not enter your NIDA number at this stage.</p></>}
      <button className="pg-button" disabled={busy}>{busy ? 'Please wait…' : register ? 'Continue to OTP →' : 'Log in'}</button>
      {message && <p role="status">{message}</p>}
    </form><p className="pg-switch">{register ? <>Already registered? <Link to="/login">Log in</Link></> : <>New student? <Link to="/register">Sign up</Link></>}</p></Frame>;
}
function RegistrationSuccess({ session }: { session: Session }) {
  const [progress, setProgress] = useState(25);
  const [step, setStep] = useState('Checking authentication session');
  const [account, setAccount] = useState<string | null>(null);
  const [failure, setFailure] = useState('');
  const [running, setRunning] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const navigate = useNavigate();
  async function continueToLogin() {
    if (!supabase) return;
    setLeaving(true);
    const { error } = await supabase.auth.signOut();
    if (error) { setFailure('Could not securely end the registration session: ' + error.message); setLeaving(false); return; }
    navigate('/login', { replace: true });
  }
  useEffect(() => {
    let active = true;
    async function verify() {
      if (!supabase) { setFailure('Supabase is not configured.'); setRunning(false); return; }
      setProgress(25); setStep('Checking authentication session'); setFailure(''); setAccount(null); setRunning(true);
      const auth = await supabase.auth.getUser();
      if (!active) return;
      if (auth.error || !auth.data.user || auth.data.user.id !== session.user.id) {
        setFailure('Authentication check failed: ' + (auth.error?.message || 'Session mismatch. Please log in again.'));
        setRunning(false); return;
      }
      setProgress(50); setStep('Checking student profile');
      const profile = await supabase.from('pg_profiles').select('user_id,full_name,playgo_account').eq('user_id', session.user.id).maybeSingle();
      if (!active) return;
      if (profile.error || !profile.data) {
        setFailure('Student profile check failed: ' + (profile.error?.message || 'Profile not found. Contact support.'));
        setRunning(false); return;
      }
      if (!profile.data.full_name || profile.data.full_name === 'Student') {
        setFailure('Student profile is incomplete: full name is missing.');
        setRunning(false); return;
      }
      setProgress(75); setStep('Verifying assigned PlayGo account number');
      const number = profile.data.playgo_account;
      if (!number || !/^09[0-9]{8}$/.test(number)) {
        setFailure('Account-number verification failed: no valid 10-digit PlayGo number beginning with 09 was found.');
        setRunning(false); return;
      }
      setAccount(number); setProgress(100); setStep('Registration checks completed'); setRunning(false);
    }
    void verify();
    return () => { active = false; };
  }, [session.user.id, attempt]);
  const checks = [
    { title: 'OTP Verification', detail: 'Demo only · SMS not verified', passed: true, failed: false },
    { title: 'Authentication session', detail: 'Secure session validation', passed: progress >= 50, failed: !!failure && progress === 25 },
    { title: 'Student profile', detail: 'Profile record and student name', passed: progress >= 75, failed: !!failure && progress === 50 },
    { title: 'PlayGo account number', detail: 'Unique 10-digit number starting 09', passed: progress === 100, failed: !!failure && progress === 75 }
  ];
  return <Frame><section aria-live="polite" style={{width:'100%',maxWidth:520,margin:'0 auto',padding:'12px 0 18px',minWidth:0}}>
    <p className="pg-eyebrow" style={{fontSize:11,letterSpacing:1.5,textAlign:'center',marginBottom:12}}>REGISTRATION VERIFICATION · STEP 3 OF 3</p>
    <div style={{textAlign:'center',marginBottom:22}}>
      <div aria-hidden="true" style={{width:56,height:56,borderRadius:'50%',margin:'0 auto 12px',display:'grid',placeItems:'center',background:failure?'#fff1f1':running?'#fff4f4':'#e9f8ee',color:failure?'#b91c1c':running?'#c93333':'#15803d',fontSize:28,fontWeight:700}}>{failure?'!':running?'…':'✓'}</div>
      <h1 style={{fontSize:'clamp(23px,6vw,30px)',lineHeight:1.18,margin:'0 0 8px'}}>{failure?'Verification stopped':running?'Checking registration':'Registration successful!'}</h1>
      <p style={{fontSize:14,color:'#666',margin:0}}>{failure?'A check needs attention before you continue.':running?'Validating your student account details.':'Your PlayGo account is ready.'}</p>
    </div>
    <div style={{background:'#fafafa',border:'1px solid #e8e8e8',borderRadius:16,padding:16,marginBottom:18}}>
      <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:12,marginBottom:10}}>
        <strong style={{fontSize:14}}>Verification progress</strong><strong style={{fontSize:20,color:failure?'#b91c1c':'#c93333'}}>{progress}%</strong>
      </div>
      <div role="progressbar" aria-label="Registration verification progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} style={{height:9,borderRadius:9,background:'#e7e7e7',overflow:'hidden'}}>
        <div style={{height:'100%',width:progress+'%',background:failure?'#b91c1c':'#c93333',borderRadius:9,transition:'width .4s ease'}}/>
      </div>
      <p style={{fontSize:12,color:'#666',margin:'10px 0 0'}}>{failure?'Stopped at failed check':step}</p>
    </div>
    <div style={{border:'1px solid #e8e8e8',borderRadius:16,overflow:'hidden',marginBottom:18}}>
      {checks.map((check,index)=><div key={check.title} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 12px',borderBottom:index===checks.length-1?'none':'1px solid #eee'}}>
        <span aria-hidden="true" style={{flex:'0 0 30px',width:30,height:30,borderRadius:'50%',background:check.failed?'#fee2e2':check.passed?'#dcfce7':'#f1f1f1',color:check.failed?'#b91c1c':check.passed?'#15803d':'#777',display:'grid',placeItems:'center',fontWeight:700,fontSize:15}}>{check.failed?'×':check.passed?'✓':index+1}</span>
        <div style={{flex:1,minWidth:0}}><strong style={{display:'block',fontSize:13,lineHeight:1.35}}>{check.title}</strong><span style={{display:'block',fontSize:11,color:'#777',lineHeight:1.4,marginTop:2}}>{check.detail}</span></div>
        <span style={{flexShrink:0,fontSize:11,fontWeight:700,color:check.failed?'#b91c1c':check.passed?'#15803d':'#888'}}>{check.failed?'Failed':check.passed?'Passed':'Pending'}</span>
      </div>)}
    </div>
    {failure && <p className="pg-error" role="alert" style={{fontSize:13,overflowWrap:'anywhere'}}>{failure}</p>}
    {account && !failure && <div style={{background:'#fff7f7',border:'1px solid #f2cccc',borderRadius:16,padding:'16px 12px',textAlign:'center',marginBottom:18,minWidth:0}}>
      <p style={{fontSize:11,fontWeight:700,letterSpacing:1,color:'#666',margin:'0 0 8px'}}>YOUR PLAYGO ACCOUNT NUMBER</p>
      <strong style={{display:'block',fontSize:'clamp(20px,5.4vw,26px)',lineHeight:1.25,letterSpacing:'1px',fontVariantNumeric:'tabular-nums',whiteSpace:'nowrap',color:'#171717'}}>{account}</strong>
      <p style={{fontSize:11,color:'#666',margin:'8px 0 0'}}>Account generated and verified</p>
    </div>}
    {failure && <button type="button" className="pg-button pg-outline" onClick={()=>setAttempt(n=>n+1)}>Retry verification</button>}
    {!running && !failure && <><p style={{fontSize:13,color:"#555",textAlign:"center",marginBottom:12}}>Registration is complete. Log in with your email and password to access your dashboard.</p><button type="button" className="pg-button" disabled={leaving} onClick={()=>void continueToLogin()}>{leaving ? "Preparing secure login…" : "Continue to Login →"}</button></>}
    
  </section></Frame>;
}
function Dashboard({ session }: { session: Session }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) return;
      const [p,e,i,y,t] = await Promise.all([
        supabase.from('pg_profiles').select('user_id,full_name,playgo_account').eq('user_id',session.user.id).maybeSingle(),
        supabase.from('pg_enrollments').select('id,institution_id,admission_number,active').eq('user_id',session.user.id),
        supabase.from('pg_institutions').select('id,name'),
        supabase.from('pg_academic_years').select('id,institution_id,label,structure'),
        supabase.from('pg_installments').select('id,academic_year_id,installment_number,amount_tzs,due_date')
      ]);
      if (!active) return;
      const firstError = [p,e,i,y,t].find(r=>r.error)?.error;
      if (firstError) setError(firstError.message);
      setProfile(p.data as Profile | null); setEnrollments((e.data || []) as Enrollment[]); setInstitutions((i.data || []) as Institution[]); setYears((y.data || []) as Year[]); setInstallments((t.data || []) as Installment[]);
    }
    void load(); return () => { active=false; };
  }, [session.user.id]);
  return <Frame><h1>Hello, {profile?.full_name || 'Student'}!</h1><p>Signed in as {session.user.email}</p><div className="pg-details"><p><strong>PlayGo Account</strong><span>{profile?.playgo_account || 'Pending provisioning'}</span></p><p><strong>Banking</strong><span>Not connected</span></p></div><h2>My institutions</h2>{enrollments.length ? enrollments.map(e=><p key={e.id}>{institutions.find(i=>i.id===e.institution_id)?.name || 'Institution'} · {e.admission_number} · {e.active ? 'Active' : 'Inactive'}</p>) : <p>No verified institution enrollment yet. Contact your institution administrator.</p>}<h2>Published fee schedules</h2>{years.length ? years.map(y=><div key={y.id}><strong>{institutions.find(i=>i.id===y.institution_id)?.name} — {y.label}</strong>{installments.filter(t=>t.academic_year_id===y.id).map(t=><p key={t.id}>Installment {t.installment_number}: TZS {Number(t.amount_tzs).toLocaleString()} · Due {t.due_date}</p>)}</div>) : <p>No published schedules available.</p>}{error && <p className="pg-error" role="alert">{error}</p>}<button className="pg-button pg-outline" onClick={()=>void supabase?.auth.signOut()}>Log out</button></Frame>;
}

type AlertTransaction={id:string;kind:string;amount_tzs:number;delta_tzs:number;note:string|null;created_at:string};
const receiptSafe=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
function receiptText(tx:AlertTransaction,account:string,holder:string){return ['PLAYGO TANZANIA LIMITED','TRANSACTION RECEIPT','Account holder: '+holder,'PlayGo account: '+account,'Reference: '+tx.id,'Date: '+new Date(tx.created_at).toLocaleString('en-GB'),'Transaction: '+tx.kind,'Amount: TZS '+Math.abs(Number(tx.delta_tzs)).toLocaleString('en-TZ'),'Type: '+(Number(tx.delta_tzs)<0?'Debit':'Credit'),'Description: '+(tx.note||'-'),'Status: Recorded','Demo App'].join('\n')}
function downloadTransactionReceipt(tx:AlertTransaction,account:string,holder:string){
 const text=receiptText(tx,account,holder);const lines=text.split('\n');const printable='<html><head><title>PlayGo Receipt</title><style>@page{size:A4;margin:20mm}body{font-family:Arial,sans-serif;color:#17202c;max-width:650px;margin:30px auto}.brand{font-size:32px;font-weight:800;border-bottom:4px solid #e51a2b;padding-bottom:20px}.brand b{color:#e51a2b}.title{font-size:21px;font-weight:700;margin:30px 0}.row{display:flex;justify-content:space-between;gap:20px;border:1px solid #dce2e9;border-bottom:0;padding:13px}.row:last-of-type{border-bottom:1px solid #dce2e9}.row span{color:#657184}.row strong{text-align:right;overflow-wrap:anywhere}.footer{margin-top:30px;border-top:1px solid #ddd;padding-top:12px;color:#777;font-size:12px}@media print{body{margin:0}}</style></head><body><div class="brand">Play<b>Go</b><div style="font-size:11px;letter-spacing:2px">TANZANIA LIMITED</div></div><div class="title">Transaction Receipt</div>'+lines.slice(2,-1).map(line=>{const index=line.indexOf(': ');return '<div class="row"><span>'+receiptSafe(line.slice(0,index))+'</span><strong>'+receiptSafe(line.slice(index+2))+'</strong></div>'}).join('')+'<div class="footer">Demo App · Transaction reference: '+receiptSafe(tx.id)+'</div></body></html>';
 const frame=document.createElement('iframe');frame.style.position='fixed';frame.style.width='0';frame.style.height='0';frame.style.border='0';document.body.appendChild(frame);const doc=frame.contentDocument;if(!doc){frame.remove();return}doc.open();doc.write(printable);doc.close();setTimeout(()=>{frame.contentWindow?.focus();frame.contentWindow?.print();setTimeout(()=>frame.remove(),60000)},300);
}
async function shareTransactionReceipt(tx:AlertTransaction,account:string,holder:string){
 const text=receiptText(tx,account,holder);
 if(navigator.share){try{await navigator.share({title:'PlayGo Transaction Receipt',text});return}catch(e){if(e instanceof Error&&e.name==='AbortError')return}}
 await navigator.clipboard.writeText(text);
}
function NotificationCenter({session}:{session:Session}){
 const [transactions,setTransactions]=useState<AlertTransaction[]>([]);const [credits,setCredits]=useState<{id:string;amount_tzs:number;source:string;reference:string;confirmed_at:string}[]>([]);
 const [profile,setProfile]=useState<{full_name:string;playgo_account:string}|null>(null);
 const [error,setError]=useState('');const [busy,setBusy]=useState(true);const [notice,setNotice]=useState('');
 useEffect(()=>{let active=true;async function load(){if(!supabase)return;const [t,c,p]=await Promise.all([
 supabase.from('pg_demo_transactions').select('id,kind,amount_tzs,delta_tzs,note,created_at').eq('user_id',session.user.id).order('created_at',{ascending:false}).limit(200),
 supabase.from('pg_student_fee_credits').select('id,amount_tzs,source,reference,confirmed_at').eq('user_id',session.user.id).order('confirmed_at',{ascending:false}).limit(100),
 supabase.from('pg_profiles').select('full_name,playgo_account').eq('user_id',session.user.id).maybeSingle()
 ]);if(!active)return;if(t.error||c.error||p.error){setError(t.error?.message||c.error?.message||p.error?.message||'Notifications unavailable')}else{setTransactions(t.data||[]);setCredits(c.data||[]);setProfile(p.data)}setBusy(false)}
 void load();window.addEventListener('playgo:wallet-updated',load);return()=>{active=false;window.removeEventListener('playgo:wallet-updated',load)}},[session.user.id]);
 const alerts=[...transactions.map(t=>({id:t.id,time:t.created_at,title:t.kind==='fee_payment'?'Fee payment recorded':Number(t.delta_tzs)<0?'Wallet debit recorded':'Wallet credit recorded',description:t.note||t.kind,amount:Number(t.delta_tzs),tx:t})),...credits.map(c=>({id:c.id,time:c.confirmed_at,title:c.source==='heslb_tuition_confirmed'?'HESLB tuition credit confirmed':'Institution fee credit confirmed',description:'Reference: '+c.reference,amount:Number(c.amount_tzs),tx:null}))].sort((a,b)=>new Date(b.time).getTime()-new Date(a.time).getTime());
 return <Frame><Link className="pg-back" to="/dashboard">← Back to Home</Link><div className="pg-notify-heading"><div><p className="pg-eyebrow">PLAYGO FINANCES</p><h1>Notification Center</h1><p>Wallet transactions and institution fee alerts.</p></div><span className="pg-notify-count">{alerts.length} alerts</span></div>
 {busy?<p>Loading notifications…</p>:error?<p role="alert" className="pg-error">{error}</p>:alerts.length===0?<div className="pg-feature-card"><h2>No alerts yet</h2><p>Your transactions and confirmed fee credits will appear here.</p></div>:<div className="pg-notify-list">{alerts.map(a=><article className="pg-notify-item" key={a.id}><div className="pg-notify-item-head"><div><strong>{a.title}</strong><small>{new Date(a.time).toLocaleString('en-GB')}</small></div><b className={a.amount<0?'pg-notify-debit':'pg-notify-credit'}>{a.amount<0?'-':'+'} TZS {Math.abs(a.amount).toLocaleString('en-TZ')}</b></div><p>{a.description}</p><small>Ref: {a.id}</small>{a.tx&&<div className="pg-notify-actions"><button type="button" onClick={()=>downloadTransactionReceipt(a.tx!,profile?.playgo_account||'',profile?.full_name||'Student')}>Download / Print PDF Receipt</button><button type="button" onClick={()=>void shareTransactionReceipt(a.tx!,profile?.playgo_account||'',profile?.full_name||'Student').then(()=>setNotice('Receipt shared or copied.')).catch(()=>setNotice('Unable to share receipt.'))}>Share Receipt</button></div>}</article>)}</div>}{notice&&<p role="status">{notice}</p>}</Frame>
}

type StudentTab = 'home'|'merchant'|'services'|'quick-loan'|'profile';
function StudentWallet({session,tab}:{session:Session;tab:StudentTab}) {
 const [profile,setProfile]=useState<Profile|null>(null);
 const [error,setError]=useState('');
 const [course,setCourse]=useState(String(session.user.user_metadata?.course_requested||''));
 const [studyYear,setStudyYear]=useState(String(session.user.user_metadata?.study_year_requested||'1'));
 const [savingCourse,setSavingCourse]=useState(false);
 const [courseMessage,setCourseMessage]=useState('');
 const [editingCourse,setEditingCourse]=useState(!session.user.user_metadata?.course_requested);
 const [savedCourse,setSavedCourse]=useState(String(session.user.user_metadata?.course_requested||''));
 const [savedStudyYear,setSavedStudyYear]=useState(String(session.user.user_metadata?.study_year_requested||'1'));
 const [approvedCourse,setApprovedCourse]=useState<string|null>(null);
 const [courseApprovalStatus,setCourseApprovalStatus]=useState<'loading'|'approved'|'pending'>('loading');
 const navigate=useNavigate();
 async function saveCourse(){
   if(!supabase)return;
   setSavingCourse(true);setCourseMessage('');
   const {error}=await supabase.auth.updateUser({data:{course_requested:course,study_year_requested:studyYear}});
   setSavingCourse(false);
   if(error){setCourseMessage('Could not save course selection: '+error.message);return;}
   setSavedCourse(course);setSavedStudyYear(studyYear);setEditingCourse(false);setCourseMessage('Course selection saved.');
 }

 useEffect(()=>{let active=true;async function loadApproval(){if(!supabase)return;const {data,error}=await supabase.from('pg_student_requests').select('course_id,status').eq('user_id',session.user.id).eq('status','approved').not('course_id','is',null).limit(1).maybeSingle();if(!active)return;if(error||!data?.course_id){setCourseApprovalStatus('pending');return;}const course=await supabase.from('pg_courses').select('name').eq('id',data.course_id).maybeSingle();if(!active)return;if(course.error||!course.data){setCourseApprovalStatus('pending');return;}setApprovedCourse(course.data.name);setCourseApprovalStatus('approved');setEditingCourse(false);}void loadApproval();return()=>{active=false};},[session.user.id]);
 useEffect(()=>{let active=true;void supabase?.from('pg_profiles').select('user_id,full_name,playgo_account').eq('user_id',session.user.id).maybeSingle().then(({data,error})=>{if(!active)return;if(error)setError(error.message);setProfile(data as Profile|null);});return()=>{active=false;};},[session.user.id]);
 useEffect(()=>{if(!profile?.playgo_account)return;try{migrateLegacyDemoTopups(session.user.id,profile.playgo_account);}catch{ /* Browser storage may be unavailable. */ }},[profile?.playgo_account,session.user.id]);
 const account=profile?.playgo_account||'';
 const institution=String(session.user.user_metadata?.institution_requested||'Institution pending verification');
 const admission=String(session.user.user_metadata?.admission_number_requested||'Pending verification');
 const tabs:[StudentTab,string,string,string][]=[['home','Home','⌂','/dashboard'],['merchant','Merchant','▣','/merchant'],['services','Services','▦','/services'],['quick-loan','Quick Loan','◇','/quick-loan']];
 return <main className="pg-page pg-student-page"><section className="pg-panel">
 <img className="pg-logo pg-small" src={logo} alt="PlayGo Tanzania Limited"/><p className="pg-eyebrow">PLAYGO FINANCES · STUDENT WALLET</p>
 {tab==='home'&&<><h1>Hello, {(profile?.full_name||'Student').split(' ')[0]}!</h1><p>Welcome to your student wallet.</p>{account?<><WalletSummary account={account} fullName={profile?.full_name||'Student'} institution={institution} supabase={supabase!} userId={session.user.id}/></>:<p>Loading your PlayGo account…</p>}</>}
 {tab==='merchant'&&(account?<MerchantPage account={account} userId={session.user.id} supabase={supabase!}/>:<p>Loading account…</p>)}
 {tab==='services'&&(account?<ServicesPage account={account} institution={institution} userId={session.user.id} supabase={supabase!}/>:<p>Loading account…</p>)}
 {tab==='profile'&&<div className="pg-profile-redesign">
 <header className="pg-profile-heading"><div className="pg-profile-avatar" aria-hidden="true">{(profile?.full_name||'S').trim().charAt(0).toUpperCase()}</div><div><p className="pg-eyebrow">STUDENT ACCOUNT</p><h1>My Profile</h1><p>{profile?.full_name||'Student'}</p></div></header>
 <section className="pg-profile-card"><div className="pg-profile-card-heading"><h2>Personal & Account Details</h2><span className="pg-profile-pill">{courseApprovalStatus==='approved'?'Verified student':courseApprovalStatus==='loading'?'Checking status':'Verification pending'}</span></div>
 <div className="pg-profile-fields"><div><span>Full name</span><strong>{profile?.full_name||'Loading…'}</strong></div><div><span>PlayGo account</span><strong>{account||'Loading…'}</strong></div><div><span>Email address</span><strong>{session.user.email}</strong></div><div><span>Institution</span><strong>{institution}</strong></div><div><span>Admission number</span><strong>{admission}</strong></div></div>
 {courseApprovalStatus!=='approved'&&<Link className="pg-profile-inline-link" to="/institution-request">Track institution verification →</Link>}
 </section>
 <section className="pg-profile-card"><div className="pg-profile-card-heading"><h2>Academic Details</h2>{courseApprovalStatus==='approved'&&<span className="pg-profile-pill">Approved</span>}</div>
 <div className="pg-profile-fields"><div><span>Course</span><strong>{approvedCourse||savedCourse||'Not selected'}</strong></div><div><span>Year of study</span><strong>Year {savedStudyYear}</strong></div><div><span>Course status</span><strong>{courseApprovalStatus==='approved'?'Approved by institution':courseApprovalStatus==='loading'?'Checking…':'Pending verification'}</strong></div></div>
 {courseApprovalStatus!=='approved'&&!editingCourse&&<button type="button" className="pg-profile-inline-button" onClick={()=>{setCourse(savedCourse);setStudyYear(savedStudyYear);setCourseMessage('');setEditingCourse(true)}}>Edit course selection →</button>}
 {courseApprovalStatus!=='approved'&&editingCourse&&<div className="pg-form"><label htmlFor="pg-course">Course</label><select id="pg-course" value={course} onChange={e=>setCourse(e.target.value)}><option value="">Select course</option><option value="Diploma in Business Administration (DBA)">Diploma in Business Administration (DBA)</option></select><label htmlFor="pg-study-year">Year of study</label><select id="pg-study-year" value={studyYear} onChange={e=>setStudyYear(e.target.value)}><option value="1">Year 1</option><option value="2">Year 2</option></select><button type="button" className="pg-button" disabled={savingCourse||!course} onClick={()=>void saveCourse()}>{savingCourse?'Saving…':'Save course'}</button>{savedCourse&&<button type="button" className="pg-button pg-outline" onClick={()=>setEditingCourse(false)}>Cancel</button>}</div>}
 {courseMessage&&<p role="status">{courseMessage}</p>}
 </section>
 <section className="pg-profile-card pg-profile-finances"><div className="pg-profile-card-heading"><h2>Fees & HESLB</h2><Link className="pg-profile-inline-link" to="/pay-fee">Pay fee →</Link></div><p>Manage tuition payments and progress in Pay Tuition Fee.</p></section>
 {account&&<section className="pg-profile-card"><h2>Linked Bank Accounts</h2><LinkedAccounts account={account} supabase={supabase ?? undefined} userId={session.user.id}/></section>}
 <button className="pg-button pg-outline pg-profile-logout" onClick={async()=>{await supabase?.auth.signOut();navigate('/login',{replace:true})}}>Log out</button>
 </div>}
 {error&&<p className="pg-error" role="alert">{error}</p>}
 
 <footer className="pg-demo-footer">Demo App</footer></section><nav className="pg-bottom-nav" aria-label="Student navigation">{tabs.map(([key,title,icon,path])=><Link key={key} to={path} className={'pg-nav-item'+((tab===key || (key==='quick-loan'&&window.location.pathname==='/quick-loan'))?' pg-nav-active':'')} aria-current={tab===key?'page':undefined}><span className="pg-nav-icon" aria-hidden="true">{icon}</span><span>{title}</span></Link>)}</nav></main>;
}
function FeeInformation({session}:{session:Session}){
 const [feeParams,setFeeParams]=useSearchParams();
 const feeView=feeParams.get('view')||'overview';
 const openFeeView=(view:string)=>setFeeParams({view});
 type Approved={institutionId:string;courseId:string;institution:string;course:string};
 type FeePayment={id:string;amount_tzs:number;created_at:string;institution_id:string;course_id:string};
 const [approved,setApproved]=useState<Approved[]>([]);
 const [payments,setPayments]=useState<FeePayment[]>([]);
 const [amount,setAmount]=useState('');
 const [selected,setSelected]=useState('');
 const [balance,setBalance]=useState<number|null>(null);
 const [message,setMessage]=useState('Loading your admission verification…');
 const [busy,setBusy]=useState(false);
 const [review,setReview]=useState<{amount:number;entry:Approved}|null>(null);
 const [otp,setOtp]=useState('');
 const [challenge,setChallenge]=useState<{code:string;expires:number}|null>(null);
 const [receipt,setReceipt]=useState<{id:string;amount:number;balance:number;date:string}|null>(null);
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{let active=true;async function load(){
  if(!supabase)return;
  const [req,en,wallet,history]=await Promise.all([
   supabase.from('pg_student_requests').select('institution_id,course_id,status').eq('user_id',session.user.id).eq('status','approved'),
   supabase.from('pg_enrollments').select('institution_id,active').eq('user_id',session.user.id).eq('active',true),
   supabase.from('pg_demo_wallets').select('balance_tzs').eq('user_id',session.user.id).maybeSingle(),
   supabase.from('pg_demo_fee_payments').select('id,amount_tzs,created_at,institution_id,course_id').eq('user_id',session.user.id).order('created_at',{ascending:false}).limit(1000)
  ]);
  if(!active)return;
  const error=[req,en,wallet,history].find(x=>x.error)?.error;
  if(error){setMessage('Unable to load payment information: '+error.message);return;}
  setBalance(Number(wallet.data?.balance_tzs??0));setPayments((history.data||[]) as FeePayment[]);
  const activeIds=new Set((en.data||[]).map(x=>x.institution_id));
  const verified=(req.data||[]).filter(x=>x.course_id&&activeIds.has(x.institution_id));
  if(!verified.length){setApproved([]);setMessage('Your institution must approve your admission before tuition payments are available.');return;}
  const [institutions,courses]=await Promise.all([
   supabase.from('pg_institutions').select('id,name').in('id',[...new Set(verified.map(x=>x.institution_id))]),
   supabase.from('pg_courses').select('id,name').in('id',[...new Set(verified.map(x=>x.course_id as string))])
  ]);
  if(!active)return;
  if(institutions.error||courses.error){setMessage('Unable to load approved course: '+(institutions.error?.message||courses.error?.message));return;}
  const entries=verified.map(x=>({institutionId:x.institution_id,courseId:x.course_id as string,institution:institutions.data?.find(i=>i.id===x.institution_id)?.name||'Institution',course:courses.data?.find(c=>c.id===x.course_id)?.name||'Approved course'}));
  setApproved(entries);setSelected(old=>entries.some(e=>e.institutionId+'|'+e.courseId===old)?old:entries[0].institutionId+'|'+entries[0].courseId);setMessage('');
 }void load();return()=>{active=false};},[session.user.id,refresh]);
 const current=approved.find(e=>e.institutionId+'|'+e.courseId===selected);
 const scoped=payments.filter(p=>p.institution_id===current?.institutionId&&p.course_id===current?.courseId);
 const total=scoped.reduce((n,p)=>n+Number(p.amount_tzs),0);
 const months=Array.from({length:6},(_,i)=>{const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-5+i);const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');return {key,label:d.toLocaleDateString('en-GB',{month:'short'}),value:scoped.filter(p=>p.created_at.slice(0,7)===key).reduce((n,p)=>n+Number(p.amount_tzs),0)};});
 const max=Math.max(1,...months.map(m=>m.value));
 function startReview(){
  const n=Number(amount);
  if(!current||!Number.isSafeInteger(n)||n<1||n>5000000){setMessage('Enter a valid amount between TZS 1 and 5,000,000.');return;}
  if(balance===null||n>balance){setMessage('Insufficient wallet balance.');return;}
  const code=String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,'0');
  setReview({amount:n,entry:current});setOtp('');setChallenge({code,expires:Date.now()+45000});setMessage('');openFeeView('verify');
 }
 async function confirm(){
  if(!supabase||busy||!review||!challenge)return;
  if(Date.now()>challenge.expires||otp!==challenge.code){setMessage('Invalid or expired OTP. Please retry.');return;}
  setBusy(true);setMessage('Processing payment…');
  const txId=crypto.randomUUID();const now=new Date().toISOString();
  const year=String(new Date().getFullYear());
  const result=await supabase.rpc('pg_pay_demo_course_fee',{p_id:txId,p_institution_id:review.entry.institutionId,p_course_id:review.entry.courseId,p_academic_year:year,p_study_year:1,p_amount:review.amount});
  setBusy(false);
  if(result.error){setMessage('Payment failed: '+result.error.message);return;}
  setReceipt({id:txId,amount:review.amount,balance:Number(result.data),date:now});openFeeView('receipt');
  setReview(null);setChallenge(null);setOtp('');setAmount('');setMessage('Payment recorded successfully.');setRefresh(n=>n+1);window.dispatchEvent(new Event('playgo:wallet-updated'));
 }
 return <Frame><Link to={feeView==='overview'?'/services':'/pay-fee'} className="pg-back">{feeView==='overview'?'← Back to Services':'← Back to Tuition Services'}</Link>
 {message&&<p role="status">{message}</p>}
 {feeView==='overview'&&<section className="pg-feature-card pg-fee-hub"><h1>Pay Tuition Fee</h1>
 <div className="pg-details"><p><strong>Available Wallet</strong><span>{balance===null?'Loading…':'TZS '+balance.toLocaleString('en-TZ')}</span></p><p><strong>Tuition paid via PlayGo</strong><span>TZS {payments.reduce((sum,p)=>sum+Number(p.amount_tzs),0).toLocaleString('en-TZ')}</span></p></div>
 <nav className="pg-fee-hub-grid" aria-label="Tuition fee services">
 <Link className="pg-fee-hub-tile" to="/pay-fee?view=payment"><strong>Tuition Payment</strong></Link>
 <Link className="pg-fee-hub-tile" to="/pay-fee?view=wallet"><strong>PlayGo Wallet</strong></Link>
 <Link className="pg-fee-hub-tile" to="/pay-fee?view=progress"><strong>Fee Payment Progress</strong></Link>
 <Link className="pg-fee-hub-tile" to="/pay-fee?view=history"><strong>Payment History</strong></Link>
 </nav>
 </section>}
 {feeView==='wallet'&&<><h1>PlayGo Wallet</h1><section className="pg-feature-card"><h2>Available Wallet Balance</h2><strong style={{fontSize:28}}>TZS {balance===null?'Loading…':balance.toLocaleString('en-TZ')}</strong></section></>}
 {feeView==='payment'&&<><h1>Tuition Payment</h1><p>Payments recorded here do not represent your institution's official fee balance.</p>{!approved.length&&!message&&<p>Loading verified institution…</p>}
 {!!approved.length&&<section className="pg-feature-card"><div className="pg-form"><label htmlFor="fee-institution">Verified institution and course</label><select id="fee-institution" value={selected} onChange={e=>setSelected(e.target.value)}>{approved.map(e=><option key={e.institutionId+'|'+e.courseId} value={e.institutionId+'|'+e.courseId}>{e.institution} — {e.course}</option>)}</select>
 <label htmlFor="fee-amount">Amount to Pay (TZS)</label><input id="fee-amount" type="number" min="1" max="5000000" step="1" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="Enter your preferred amount"/>
 <button type="button" className="pg-button" disabled={busy||!!review} onClick={startReview}>Review & Verify OTP →</button></div></section>}</>}
 {feeView==='progress'&&<><h1>Fee Payment Progress</h1><section className="pg-feature-card"><div className="pg-fee-grid"><p>Total Paid via PlayGo<b>TZS {total.toLocaleString('en-TZ')}</b></p><p>Payments<b>{scoped.length}</b></p></div>
 <div className="pg-fee-trend" role="img" aria-label={months.map(m=>m.label+': TZS '+m.value).join(', ')}>{months.map(m=><div key={m.key} className="pg-fee-trend-month"><strong>{m.value?m.value.toLocaleString('en-TZ'):'—'}</strong><div className="pg-fee-trend-track"><div style={{height:(m.value?Math.max(5,m.value/max*100):0)+'%'}}/></div><small>{m.label}</small></div>)}</div></section></>}
 {feeView==='history'&&<><h1>Tuition Payment History</h1><section className="pg-feature-card">{scoped.map(p=><div key={p.id} className="pg-tx"><span>{new Date(p.created_at).toLocaleDateString('en-GB')}</span><strong>TZS {Number(p.amount_tzs).toLocaleString('en-TZ')}</strong></div>)}{!scoped.length&&<p>No tuition payments yet.</p>}</section></>}
 {feeView==='verify'&&<><h1>Review Fee Payment</h1>{!review?<p>Payment review expired or was cancelled. <Link to="/pay-fee?view=payment">Start again</Link>.</p>:<section className="pg-feature-card pg-fee-review"><div className="pg-fee-review-amount"><span>Amount to pay</span><strong>TZS {review.amount.toLocaleString('en-TZ')}</strong></div><div className="pg-fee-review-details"><div><span>Institution</span><strong>{review.entry.institution}</strong></div><div><span>Course</span><strong>{review.entry.course}</strong></div><div><span>Wallet after payment</span><strong>TZS {((balance??0)-review.amount).toLocaleString('en-TZ')}</strong></div></div><div className="pg-fee-review-verify"><h3>OTP Verification</h3><div className="pg-fee-review-code"><strong>{challenge?.code}</strong><small>Expires in 45 seconds</small></div><label htmlFor="fee-otp">Enter 6-digit OTP</label><input id="fee-otp" inputMode="numeric" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}/></div><div className="pg-fee-review-actions"><button type="button" className="pg-button" disabled={busy||otp.length!==6} onClick={()=>void confirm()}>{busy?'Processing…':'Confirm Payment'}</button><button type="button" className="pg-button pg-outline" disabled={busy} onClick={()=>{setReview(null);setChallenge(null);setOtp('');openFeeView('payment');}}>Cancel</button></div></section>}</>}
 {feeView==='receipt'&&<><h1>Payment Confirmation</h1>{receipt?<section className="pg-feature-card" role="status"><h2>Payment Recorded</h2><p><strong>TZS {receipt.amount.toLocaleString('en-TZ')}</strong></p><p>Reference: {receipt.id}</p><p>This record confirms a PlayGo payment, not settlement by your university.</p><button type="button" className="pg-button" onClick={()=>downloadTransactionReceipt({id:receipt.id,kind:'fee_payment',amount_tzs:receipt.amount,delta_tzs:-receipt.amount,note:'Tuition fee',created_at:receipt.date},String(session.user.user_metadata?.playgo_account||''),String(session.user.user_metadata?.full_name||session.user.email||'Student'))}>Download Receipt</button></section>:<p>No payment confirmation in this session. <Link to="/pay-fee?view=history">View payment history</Link>.</p>}</>}
 </Frame>;
}
function LinkedAccountsRoute({session}:{session:Session}){
 const [account,setAccount]=useState<string|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>{let active=true;if(!supabase){setError('Wallet service is unavailable.');return;}void supabase.from('pg_profiles').select('playgo_account').eq('user_id',session.user.id).maybeSingle().then(({data,error:lookupError})=>{if(!active)return;if(lookupError){setError('Unable to load PlayGo account: '+lookupError.message);return;}if(!data?.playgo_account){setError('PlayGo account number is unavailable.');return;}setAccount(String(data.playgo_account));});return()=>{active=false;};},[session.user.id]);
 return <Frame><Link to="/services" className="pg-back">← Back to Services</Link><section className="pg-feature-card"><h1>Linked Accounts</h1><p>NMB Bank</p>{error?<p className="pg-error" role="alert">{error}</p>:!account?<p role="status">Loading linked accounts…</p>:<LinkedAccounts account={account} supabase={supabase!} userId={session.user.id}/>}</section></Frame>;
}
function WalletAccountRoute({session,kind}:{session:Session;kind:'add-money'|'quick-loan'|'transfer-bank'|'transaction-status'|'transaction-otp'|'history'}){
 const location=useLocation();
 const fromServices=location.state?.from==='/services';
 const historyFromServices=kind==='history'&&fromServices;
 const loanSubpage=kind==='quick-loan'&&new URLSearchParams(location.search).get('view')!==null&&new URLSearchParams(location.search).get('view')!=='overview';
 const [account,setAccount]=useState<string|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>{let active=true;void supabase?.from('pg_profiles').select('playgo_account').eq('user_id',session.user.id).maybeSingle().then(({data,error:lookupError})=>{
 if(!active)return;
 if(lookupError){setError('Unable to load PlayGo account: '+lookupError.message);return;}
 if(!data?.playgo_account){setError('PlayGo account number is not available. Please contact support.');return;}
 try{migrateLegacyDemoTopups(session.user.id,String(data.playgo_account));}catch{ /* Demo migration may be unavailable when browser storage is blocked. */ }
 setAccount(String(data.playgo_account));
 });return()=>{active=false;};},[session.user.id]);
 return <Frame>{error?<p className="pg-error" role="alert">{error}</p>:!account?<p>Loading your PlayGo wallet…</p>:kind==='add-money'?<AddMoneyPage account={account} supabase={supabase!} userId={session.user.id}/>:kind==='transfer-bank'?<BankTransferPage account={account} supabase={supabase!} userId={session.user.id}/>:kind==='transaction-status'?<TransactionStatus account={account}/>:kind==='transaction-otp'?<TransactionOtp account={account} findAccount={()=>undefined}/>:kind==='history'?<>{!new URLSearchParams(location.search).has("transaction")&&<Link to={historyFromServices?"/services":"/dashboard"} className="pg-back">{historyFromServices?"← Back to Services":"← Back to Home"}</Link>}<History account={account} supabase={supabase!} userId={session.user.id}/></>:<>{!loanSubpage&&<Link to="/services" className="pg-back">← Back to Services</Link>}<SecureQuickLoan supabase={supabase!} userId={session.user.id}/></>}</Frame>;
}
export default function SecureApp() {
  const location=useLocation();
  const [session,setSession] = useState<Session | null>(null); const [loading,setLoading] = useState(true);
  useEffect(()=>{if (!supabase) return; void supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false);}); const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);setLoading(false);});return ()=>subscription.unsubscribe();},[]);
  if (!supabase) return <Frame><h1>Configuration required</h1><p>Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your local environment. Do not use a secret or service-role key.</p></Frame>;
  if (loading) return <Frame><p>Checking secure session…</p></Frame>;
  // Keep the registration result screen mounted after Supabase signs the new user in.
  const role=String(session?.user.app_metadata?.playgo_role||'student');
  const studentSession=role==='student'?session:null;
  const roleHome=role==='admin'?'/admin':role==='institution_admin'?'/institution':'/dashboard';
  const showBell=!!studentSession && !["/login","/register","/registration-success","/welcome","/"].includes(location.pathname);
  return <>{showBell&&<Link to="/profile" className="pg-global-profile" aria-label="My Profile" title="My Profile"><svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"/></svg></Link>}{showBell&&<Link to="/notifications" className="pg-global-bell" aria-label="Notification Center" title="Notification Center"><svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg></Link>}<Routes><Route path="/" element={session?<Navigate to={roleHome} replace/>:<Splash/>}/><Route path="/welcome" element={session?<Navigate to={roleHome} replace/>:<Welcome/>}/><Route path="/login" element={session?<Navigate to={roleHome} replace/>:<AuthForm register={false}/>}/><Route path="/register" element={<AuthForm register/>}/><Route path="/registration-success" element={studentSession?<RegistrationSuccess session={studentSession}/>:<Navigate to="/login" replace/>}/><Route path="/institution-request" element={studentSession?<StudentInstitutionRequest session={studentSession} supabase={supabase!}/>:<Navigate to="/login" replace/>}/><Route path="/institution/login" element={<InstitutionLogin supabase={supabase!} session={session}/>}/><Route path="/institution" element={session?<InstitutionPortal supabase={supabase!} session={session}/>:<Navigate to="/institution/login" replace/>}/><Route path="/admin/login" element={<AdminLogin supabase={supabase!}/>}/><Route path="/admin" element={session?<AdminPortal session={session} supabase={supabase!}/>:<Navigate to="/admin/login" replace/>}/><Route path="/dashboard" element={studentSession?<StudentWallet session={studentSession} tab="home"/>:<Navigate to="/login" replace/>}/><Route path="/merchant" element={studentSession?<StudentWallet session={studentSession} tab="merchant"/>:<Navigate to="/login" replace/>}/><Route path="/services" element={studentSession?<StudentWallet session={studentSession} tab="services"/>:<Navigate to="/login" replace/>}/><Route path="/government-loan" element={studentSession?<Frame><Link to="/services" className="pg-back">← Back to Services</Link><GovernmentStudentLoan/></Frame>:<Navigate to="/login" replace/>}/><Route path="/notifications" element={studentSession?<NotificationCenter session={studentSession}/>:<Navigate to="/login" replace/>}/><Route path="/linked-accounts" element={studentSession?<LinkedAccountsRoute session={studentSession}/>:<Navigate to="/login" replace/>}/><Route path="/pay-fee" element={studentSession?<FeeInformation session={studentSession}/>:<Navigate to="/login" replace/>}/><Route path="/quick-loan" element={studentSession?<WalletAccountRoute session={studentSession} kind="quick-loan"/>:<Navigate to="/login" replace/>}/><Route path="/transfer-bank" element={studentSession?<WalletAccountRoute session={studentSession} kind="transfer-bank"/>:<Navigate to="/login" replace/>}/><Route path="/transfer" element={<Navigate to="/transfer-bank" replace/>}/><Route path="/transaction-otp" element={studentSession?<WalletAccountRoute session={studentSession} kind="transaction-otp"/>:<Navigate to="/login" replace/>}/><Route path="/transaction-status" element={studentSession?<WalletAccountRoute session={studentSession} kind="transaction-status"/>:<Navigate to="/login" replace/>}/><Route path="/history" element={studentSession?<WalletAccountRoute session={studentSession} kind="history"/>:<Navigate to="/login" replace/>}/><Route path="/add-money" element={studentSession?<WalletAccountRoute session={studentSession} kind="add-money"/>:<Navigate to="/login" replace/>}/><Route path="/profile" element={studentSession?<StudentWallet session={studentSession} tab="profile"/>:<Navigate to="/login" replace/>}/><Route path="*" element={<Navigate to={session?'/dashboard':'/'} replace/>}/></Routes></>;
}
