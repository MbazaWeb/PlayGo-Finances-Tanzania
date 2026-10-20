import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { createClient, type Session } from '@supabase/supabase-js';
import './styles.css';
import AdminPortal from './AdminPortal';
import AdminLogin from './AdminLogin';
import InstitutionPortal, {InstitutionLogin} from './InstitutionPortal';
import StudentInstitutionRequest from './StudentInstitutionRequest';
import { MerchantPage } from './Merchant';
import { ServicesPage, QuickLoan, HomeLoanStatus, GovernmentStudentLoan } from './Services';
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
type StudentFinance={courseName:string;fee:number|null;feeSource:string;feeYear:string|null;loanRows:{id:string;academic_year:string;amount_tzs:number;status:string;tuition_tzs:number;meals_accommodation_tzs:number;books_stationery_tzs:number;field_practical_tzs:number;research_tzs:number;other_tzs:number}[];credits:{id:string;academic_year:string;amount_tzs:number;source:string;reference:string;confirmed_at:string}[]};
function StudentFinancialOverview({userId,studyYear}:{userId:string;studyYear:string}){
 const [finance,setFinance]=useState<StudentFinance|null>(null);const [message,setMessage]=useState('Loading institution-approved financial records…');
 useEffect(()=>{let mounted=true;async function load(){
  if(!supabase)return;
  const requests=await supabase.from('pg_student_requests').select('institution_id,course_id,status').eq('user_id',userId).eq('status','approved');
  if(!mounted)return;
  if(requests.error){setMessage('Unable to load approved enrollment: '+requests.error.message);return;}
  const request=requests.data?.find(r=>r.course_id);
  if(!request){setMessage('Your institution must approve your course before a fee balance can be calculated.');return;}
  const [course,fees,loans,credits]=await Promise.all([
   supabase.from('pg_courses').select('name,fee_tzs').eq('id',request.course_id).maybeSingle(),
   supabase.from('pg_course_fees').select('academic_year,study_year,amount_tzs').eq('course_id',request.course_id).eq('study_year',Number(studyYear)).order('academic_year',{ascending:false}).limit(1),
   supabase.from('pg_heslb_disbursements').select('id,academic_year,amount_tzs,status,tuition_tzs,meals_accommodation_tzs,books_stationery_tzs,field_practical_tzs,research_tzs,other_tzs').eq('user_id',userId).eq('institution_id',request.institution_id),
   supabase.from('pg_student_fee_credits').select('id,academic_year,amount_tzs,source,reference,confirmed_at').eq('user_id',userId).eq('institution_id',request.institution_id)
  ]);
  if(!mounted)return;
  const failure=[course,fees,loans,credits].find(r=>r.error)?.error;
  if(failure){setMessage('Unable to load financial overview: '+failure.message);return;}
  const configured=fees.data?.[0];const base=course.data?.fee_tzs;
  setFinance({courseName:course.data?.name||'Approved course',fee:configured?Number(configured.amount_tzs):base!=null?Number(base):null,feeSource:configured?'Configured course fee · '+configured.academic_year:'Programme catalogue reference only',feeYear:configured?.academic_year||null,loanRows:loans.data||[],credits:credits.data||[]});setMessage('');
 }void load();return()=>{mounted=false};},[userId,studyYear]);
 if(!finance)return <section className="pg-details"><h2>Student Financial Overview</h2><p>{message}</p></section>;
 const totalLoan=finance.loanRows.reduce((n,r)=>n+Number(r.amount_tzs),0);
 const applicableCredits=finance.feeYear?finance.credits.filter(r=>r.academic_year===finance.feeYear):[];
 const totalCredit=applicableCredits.reduce((n,r)=>n+Number(r.amount_tzs),0);
 const balance=finance.feeYear&&finance.fee!==null?Math.max(0,finance.fee-totalCredit):null;
 const categories:[string,keyof StudentFinance['loanRows'][number]][]=[['Tuition / Fees','tuition_tzs'],['Meals & Accommodation','meals_accommodation_tzs'],['Books & Stationery','books_stationery_tzs'],['Field / Practical','field_practical_tzs'],['Research','research_tzs'],['Other','other_tzs']];
 const format=(n:number)=>'TZS '+n.toLocaleString('en-TZ');
 return <section style={{margin:'20px 0',border:'1px solid #e4e9f1',borderRadius:16,padding:18}}>
 <h2>Student Financial Overview</h2>
 <div className="pg-details"><p><strong>Approved course</strong><span>{finance.courseName}</span></p><p><strong>Year {studyYear} fee</strong><span>{finance.fee===null?'Not configured':format(finance.fee)}</span></p><p><strong>Fee basis</strong><span>{finance.feeSource}</span></p><p><strong>HESLB allocation reported</strong><span>{format(totalLoan)}</span></p><p><strong>Confirmed fee credits</strong><span>{format(totalCredit)}</span></p><p><strong>Remaining university fee</strong><span>{balance===null?'Awaiting configured academic-year fee':format(balance)}</span></p></div>
 {balance!==null&&<div style={{height:10,background:'#e9edf4',borderRadius:8,overflow:'hidden',margin:'12px 0'}} role="progressbar" aria-label="Confirmed fee payment progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={finance.fee?Math.min(100,Math.round(totalCredit/finance.fee*100)):100}><div style={{width:(finance.fee?Math.min(100,totalCredit/finance.fee*100):100)+'%',height:'100%',background:'#11845b'}}/></div>}
 <h3>HESLB allocation distribution</h3>{finance.loanRows.length?finance.loanRows.map(r=><div key={r.id} className="pg-details"><p><strong>{r.academic_year}</strong><span>{format(r.amount_tzs)} · {r.status==='verified'?'Verified source record':'Institution reported / unverified'}</span></p>{categories.filter(([,key])=>Number(r[key]||0)>0).map(([label,key])=><p key={key}><strong>{label}</strong><span>{format(Number(r[key]||0))}</span></p>)}</div>):<p>No institution-reported HESLB allocation yet.</p>}
 <h3>Confirmed fee payments / credits</h3>{finance.credits.length?finance.credits.map(c=><p key={c.id} className="pg-details"><strong>{c.source==='heslb_tuition_confirmed'?'HESLB tuition credit':'Institution-confirmed payment'} · {c.academic_year}</strong><span>{format(Number(c.amount_tzs))} · Ref: {c.reference}</span></p>):<p>No confirmed fee payments or credits recorded.</p>}
 
 </section>;
}
type StudentTab = 'home'|'merchant'|'services'|'profile';
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
 const navigate=useNavigate();
 async function saveCourse(){
   if(!supabase)return;
   setSavingCourse(true);setCourseMessage('');
   const {error}=await supabase.auth.updateUser({data:{course_requested:course,study_year_requested:studyYear}});
   setSavingCourse(false);
   if(error){setCourseMessage('Could not save course selection: '+error.message);return;}
   setSavedCourse(course);setSavedStudyYear(studyYear);setEditingCourse(false);setCourseMessage('Course selection saved. Admission is pending university verification.');
 }

 useEffect(()=>{let active=true;void supabase?.from('pg_profiles').select('user_id,full_name,playgo_account').eq('user_id',session.user.id).maybeSingle().then(({data,error})=>{if(!active)return;if(error)setError(error.message);setProfile(data as Profile|null);});return()=>{active=false;};},[session.user.id]);
 useEffect(()=>{if(!profile?.playgo_account)return;try{migrateLegacyDemoTopups(session.user.id,profile.playgo_account);}catch{ /* Browser storage may be unavailable. */ }},[profile?.playgo_account,session.user.id]);
 const account=profile?.playgo_account||'';
 const institution=String(session.user.user_metadata?.institution_requested||'Institution pending verification');
 const admission=String(session.user.user_metadata?.admission_number_requested||'Pending verification');
 const tabs:[StudentTab,string,string,string][]=[['home','Home','⌂','/dashboard'],['merchant','Merchant','▣','/merchant'],['services','Services','▦','/services'],['profile','Profile','♙','/profile']];
 return <main className="pg-page pg-student-page"><section className="pg-panel">
 <img className="pg-logo pg-small" src={logo} alt="PlayGo Tanzania Limited"/><p className="pg-eyebrow">PLAYGO FINANCES · STUDENT WALLET</p>
 {tab==='home'&&<><h1>Hello, {(profile?.full_name||'Student').split(' ')[0]}!</h1><p>Welcome to your student wallet.</p>{account?<><WalletSummary account={account} fullName={profile?.full_name||'Student'} institution={institution} supabase={supabase!} userId={session.user.id}/><HomeLoanStatus account={account}/><StudentFinancialOverview userId={session.user.id} studyYear={savedStudyYear}/></>:<p>Loading your PlayGo account…</p>}</>}
 {tab==='merchant'&&(account?<MerchantPage account={account} userId={session.user.id} supabase={supabase!}/>:<p>Loading account…</p>)}
 {tab==='services'&&(account?<ServicesPage account={account} institution={institution}/>:<p>Loading account…</p>)}
 {tab==='profile'&&<><h1>My Profile</h1><StudentFinancialOverview userId={session.user.id} studyYear={savedStudyYear}/><div className="pg-details"><p><strong>Full name</strong><span>{profile?.full_name||'Loading…'}</span></p><p><strong>Account number</strong><span>{account||'Pending'}</span></p><p><strong>Institution</strong><span>{institution}</span></p><p><strong>Admission number</strong><span>{admission}</span></p><p><strong>Email</strong><span style={{overflowWrap:'anywhere'}}>{session.user.email}</span></p><p><strong>University verification</strong><span>Check your institution request status below</span></p></div><Link className="pg-button pg-outline" to="/institution-request">Submit / Track Institution Verification →</Link><section style={{margin:'22px 0',border:'1px solid #e5e5e5',borderRadius:16,padding:16}}>
 <h2 style={{marginTop:0}}>Course Admitted & Fees</h2>
 
 {institution.toLowerCase().includes('ruaha catholic')?
 <>
 {savedCourse&&!editingCourse&&<div className="pg-details"><p><strong>Course admitted</strong><span>{savedCourse}</span></p><p><strong>Year of study</strong><span>Year {savedStudyYear}</span></p><p><strong>Selection status</strong><span>Pending university verification</span></p></div>}
 {savedCourse&&!editingCourse&&<button type="button" className="pg-button pg-outline" aria-label="Edit course selection" onClick={()=>{setCourse(savedCourse);setStudyYear(savedStudyYear);setCourseMessage('');setEditingCourse(true);}}>✎ Edit course</button>}
 {editingCourse&&<div className="pg-form">
 <label htmlFor="pg-course">Course admitted</label>
 <select id="pg-course" value={course} onChange={e=>setCourse(e.target.value)}><option value="">Select course</option><option value="Diploma in Business Administration (DBA)">Diploma in Business Administration (DBA)</option></select>
 <label htmlFor="pg-study-year">Year of study</label>
 <select id="pg-study-year" value={studyYear} onChange={e=>setStudyYear(e.target.value)}><option value="1">Year 1</option><option value="2">Year 2</option></select>
 <button type="button" className="pg-button pg-outline" disabled={savingCourse||!course} onClick={()=>void saveCourse()}>{savingCourse?'Saving…':'Save course selection'}</button>
 {savedCourse&&<button type="button" className="pg-button pg-outline" disabled={savingCourse} onClick={()=>{setCourse(savedCourse);setStudyYear(savedStudyYear);setEditingCourse(false);setCourseMessage('');}}>Cancel</button>}
 </div>}
 {courseMessage&&<p role="status" style={{fontSize:13}}>{courseMessage}</p>}
 {savedCourse==='Diploma in Business Administration (DBA)'&&<div style={{marginTop:16}}>
 <p className="pg-eyebrow">RUCU · DBA · ACADEMIC YEAR 2026/2027</p>
 <div className="pg-details"><p><strong>Programme duration</strong><span>2 years</span></p><p><strong>Year {savedStudyYear} fees</strong><span>TZS {(savedStudyYear==='1'?1335000:1445000).toLocaleString()}</span></p><p><strong>Whole programme</strong><span>TZS 2,780,000</span></p><p><strong>Tuition per year</strong><span>TZS 1,060,000</span></p><p><strong>Fee payment status</strong><span>Not verified</span></p></div>
 <h3>Payment schedule · Year {savedStudyYear}</h3>
 <div className="pg-details">{[savedStudyYear==='1'?540000:650000,265000,265000,265000].map((amount,i)=><p key={i}><strong>Instalment {i+1}</strong><span>TZS {amount.toLocaleString()}</span></p>)}</div>
 <p className="pg-note">The university schedule includes non-tuition charges. Payment must use RUCU SIMS control numbers. This is a fee reference only, not a payment request. Accommodation, NHIF and late-registration charges may apply separately.</p>
 </div>}
 </>:<p className="pg-note">No verified course fee schedule has been provided for this institution. Ask your university administrator to publish the official schedule.</p>}
 </section>{account&&<LinkedAccounts account={account} supabase={supabase ?? undefined} userId={session.user.id}/>}<button className="pg-button pg-outline" onClick={async()=>{await supabase?.auth.signOut();navigate('/login',{replace:true});}}>Log out</button></>}
 {error&&<p className="pg-error" role="alert">{error}</p>}
 
 <footer className="pg-demo-footer">Demo App</footer></section><nav className="pg-bottom-nav" aria-label="Student navigation">{tabs.map(([key,title,icon,path])=><Link key={key} to={path} className={'pg-nav-item'+(tab===key?' pg-nav-active':'')} aria-current={tab===key?'page':undefined}><span className="pg-nav-icon" aria-hidden="true">{icon}</span><span>{title}</span></Link>)}</nav></main>;
}
function FeeInformation({session}:{session:Session}) {
 const [fees,setFees]=useState<{institution:string;course:string;academicYear:string;studyYear:number;amount:number;confirmed:number;demoPaid:number;institutionId:string;courseId:string}[]>([]);
 const [message,setMessage]=useState('Loading your approved course fees…');
 const [amounts,setAmounts]=useState<Record<string,string>>({});
 const [paying,setPaying]=useState(false);
 const [paymentMessage,setPaymentMessage]=useState('');
 const [refreshKey,setRefreshKey]=useState(0);
 const [walletBalance,setWalletBalance]=useState<number|null>(null);
 const [walletError,setWalletError]=useState('');
 const walletReadVersion=useRef(0);
 const [lastReceipt,setLastReceipt]=useState<{id:string;amount:number;balance:number}|null>(null);
 const [reviewFee,setReviewFee]=useState<{fee:typeof fees[number];amount:number}|null>(null);
 const [otp,setOtp]=useState('');
 const [otpChallenge,setOtpChallenge]=useState<{code:string;expires:number}|null>(null);
 useEffect(()=>{let active=true;const version=++walletReadVersion.current;
  async function readWallet(){if(!supabase)return;const {data,error}=await supabase.from('pg_demo_wallets').select('balance_tzs').eq('user_id',session.user.id).maybeSingle();
   if(!active||version!==walletReadVersion.current)return;
   if(error){setWalletError('Wallet balance unavailable: '+error.message);return;}
   setWalletError('');setWalletBalance(Number(data?.balance_tzs??0));
  }void readWallet();return()=>{active=false};},[session.user.id,refreshKey]);
 useEffect(()=>{let active=true;async function load(){
  if(!supabase)return;
  const {data:requests,error:requestError}=await supabase.from('pg_student_requests').select('institution_id,course_id,status').eq('user_id',session.user.id).eq('status','approved');
  if(!active)return;
  if(requestError){setMessage('Unable to check institution approval: '+requestError.message);return;}
  const approved=(requests||[]).filter(x=>x.course_id);
  if(!approved.length){setMessage('No approved course was found for this signed-in student account. Please confirm you are using the same account approved by your institution.');return;}
  const institutionIds=[...new Set(approved.map(x=>x.institution_id))];
  const courseIds=[...new Set(approved.map(x=>String(x.course_id)))];
  const [enrollments,inst,courses,feeRows,credits,demoPayments]=await Promise.all([
   supabase.from('pg_enrollments').select('institution_id,active').eq('user_id',session.user.id).eq('active',true).in('institution_id',institutionIds),
   supabase.from('pg_institutions').select('id,name').in('id',institutionIds),
   supabase.from('pg_courses').select('id,name').in('id',courseIds),
   supabase.from('pg_course_fees').select('course_id,institution_id,academic_year,study_year,amount_tzs').in('course_id',courseIds).order('academic_year',{ascending:false}),
   supabase.from('pg_student_fee_credits').select('institution_id,academic_year,amount_tzs').eq('user_id',session.user.id).in('institution_id',institutionIds),
   supabase.from('pg_demo_fee_payments').select('institution_id,course_id,academic_year,study_year,amount_tzs').eq('user_id',session.user.id)
  ]);
  if(!active)return;
  const failed=[enrollments,inst,courses,feeRows,credits,demoPayments].find(x=>x.error)?.error;
  if(failed){setMessage('Unable to load course fees: '+failed.message);return;}
  const activeIds=new Set((enrollments.data||[]).map(x=>x.institution_id));
  if(!approved.some(x=>activeIds.has(x.institution_id))){setMessage('Your course is approved, but the current student session has no active enrollment visible. Please sign out, sign in again, and contact your institution if this persists.');return;}
  const found=(feeRows.data||[]).filter(f=>approved.some(x=>x.course_id===f.course_id&&x.institution_id===f.institution_id)&&activeIds.has(f.institution_id)).map(f=>({
   institution:inst.data?.find(i=>i.id===f.institution_id)?.name||'Institution',institutionId:f.institution_id,courseId:f.course_id,
   course:courses.data?.find(c=>c.id===f.course_id)?.name||'Approved course',
   academicYear:f.academic_year,studyYear:Number(f.study_year),amount:Number(f.amount_tzs),
   confirmed:(credits.data||[]).filter(c=>c.institution_id===f.institution_id&&c.academic_year===f.academic_year).reduce((n,c)=>n+Number(c.amount_tzs),0),
   demoPaid:(demoPayments.data||[]).filter(c=>c.institution_id===f.institution_id&&c.course_id===f.course_id&&c.academic_year===f.academic_year&&c.study_year===f.study_year).reduce((n,c)=>n+Number(c.amount_tzs),0)
  }));
  setFees(found);
  setMessage(found.length?'':'Your institution has approved your course but has not configured a course fee schedule yet.');
 }void load();return()=>{active=false};},[session.user.id,refreshKey]);
 function reviewPayment(f:typeof fees[number]){
  const key=f.courseId+'-'+f.academicYear+'-'+f.studyYear;
  const amount=Number(amounts[key]);const remaining=Math.max(0,f.amount-f.confirmed-f.demoPaid);
  if(!Number.isSafeInteger(amount)||amount<1||amount>remaining){setPaymentMessage('Enter a valid amount within the remaining fee balance.');return;}
  if(walletBalance===null||amount>walletBalance){setPaymentMessage('Insufficient demo wallet balance. Add demo funds to the PlayGo Wallet first.');return;}
  const code=String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,'0');
  setReviewFee({fee:f,amount});setOtp('');setOtpChallenge({code,expires:Date.now()+45000});setPaymentMessage('');
 }
 async function confirmPayment(){
  if(!supabase||paying||!reviewFee||!otpChallenge)return;
  if(Date.now()>otpChallenge.expires||otp!==otpChallenge.code){setPaymentMessage('Invalid or expired demo OTP. Generate a new OTP.');return;}
  const {fee:f,amount}=reviewFee;setPaying(true);setPaymentMessage('Processing demo payment…');
  const txId=crypto.randomUUID();const result=await supabase.rpc('pg_pay_demo_course_fee',{p_id:txId,p_institution_id:f.institutionId,p_course_id:f.courseId,p_academic_year:f.academicYear,p_study_year:f.studyYear,p_amount:amount});
  setPaying(false);
  if(result.error){setPaymentMessage('Payment failed: '+result.error.message);return;}
  // The RPC returns the authoritative post-debit wallet balance. Invalidate earlier reads before updating UI.
  walletReadVersion.current+=1;
  const newBalance=Number(result.data);
  setWalletBalance(newBalance);setWalletError('');setLastReceipt({id:txId,amount,balance:newBalance});
  setPaymentMessage('Payment recorded successfully.');
  setReviewFee(null);setOtpChallenge(null);setOtp('');setAmounts(prev=>({...prev,[f.courseId+'-'+f.academicYear+'-'+f.studyYear]:''}));setRefreshKey(n=>n+1);window.dispatchEvent(new Event('playgo:wallet-updated'));
 }
 return <Frame><Link to="/dashboard" className="pg-back">← Back to Home</Link><h1>Pay Fee</h1>
 <p>Review your course fees, make a payment from your PlayGo Wallet, and track your remaining balance.</p>
 {message&&<p role="status">{message}</p>}
 <div className="pg-feature-card" style={{padding:'20px 22px',margin:'22px 0',borderRadius:16,background:'#171717',color:'#fff'}}><div style={{fontSize:12,letterSpacing:1.3,opacity:.8}}>PLAYGO WALLET</div><div style={{fontSize:32,fontWeight:750,margin:'10px 0 4px'}}>{walletBalance===null?'Loading…':'TZS '+walletBalance.toLocaleString('en-TZ')}</div><div style={{fontSize:13,opacity:.8}}>Available balance · Updated after every payment</div></div>
 {walletError&&<p role="alert">{walletError}</p>}
 {fees.map((f,i)=><section className="pg-details" key={f.courseId+'-'+f.academicYear+'-'+f.studyYear}>
 <h2>{f.course}</h2>
 <p><strong>Institution</strong><span>{f.institution}</span></p>
 <p><strong>Academic Year</strong><span>{f.academicYear} · Study Year {f.studyYear}</span></p>
 <p><strong>Course Fee</strong><span>TZS {f.amount.toLocaleString('en-TZ')}</span></p>
 <p><strong>Confirmed Fee Credits</strong><span>TZS {f.confirmed.toLocaleString('en-TZ')}</span></p>
 <p><strong>Wallet Fee Payments</strong><span>TZS {f.demoPaid.toLocaleString('en-TZ')}</span></p>
 <p><strong>Remaining Fee Balance</strong><span style={{fontWeight:750,color:'#dc162a'}}>TZS {Math.max(0,f.amount-f.confirmed-f.demoPaid).toLocaleString('en-TZ')}</span></p>
 <div style={{height:9,borderRadius:20,background:'#f1f2f5',overflow:'hidden',margin:'12px 0 22px'}}><div style={{height:'100%',width:Math.min(100,(f.confirmed+f.demoPaid)/Math.max(1,f.amount)*100)+'%',background:'#e51a2b',borderRadius:20}}/></div>
 <div className="pg-form" style={{margin:'18px 0'}}><label htmlFor={'fee-amount-'+i}>Amount to pay (TZS)</label><input id={'fee-amount-'+i} type="number" min="1" step="1" max={Math.max(0,f.amount-f.confirmed-f.demoPaid)} placeholder="Enter any amount up to your remaining fee" value={amounts[f.courseId+'-'+f.academicYear+'-'+f.studyYear]||''} onChange={e=>setAmounts(prev=>({...prev,[f.courseId+'-'+f.academicYear+'-'+f.studyYear]:e.target.value}))}/><button type="button" className="pg-button" disabled={paying||f.amount<=f.confirmed+f.demoPaid} onClick={()=>reviewPayment(f)}>Review & Verify OTP →</button></div>
 
 
 </section>)}
 {reviewFee&&<section className="pg-feature-card" aria-label="Review fee payment"><h2>Review Fee Payment</h2><p>Course: {reviewFee.fee.course}</p><p>Institution: {reviewFee.fee.institution}</p><p>Amount: TZS {reviewFee.amount.toLocaleString('en-TZ')}</p><p>Source: PlayGo Wallet</p><p>Wallet balance: TZS {(walletBalance??0).toLocaleString('en-TZ')}</p><p>Balance after payment: TZS {((walletBalance??0)-reviewFee.amount).toLocaleString('en-TZ')}</p><p><strong>Verification code:</strong> {otpChallenge?.code} · Valid for 45 seconds</p><label htmlFor="fee-otp">Enter 6-digit OTP</label><input id="fee-otp" inputMode="numeric" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/[^0-9]/g,'').slice(0,6))}/><button type="button" className="pg-button" disabled={paying||otp.length!==6} onClick={()=>void confirmPayment()}>{paying?'Processing…':'Confirm Fee Payment'}</button><button type="button" onClick={()=>{setReviewFee(null);setOtpChallenge(null);setOtp('');}}>Cancel</button></section>}
  {lastReceipt&&<section className="pg-feature-card" style={{padding:22,border:'1px solid #b7e0c6',borderRadius:16,background:'#f5fcf7'}}><h2 style={{marginTop:0}}>Payment Successful</h2><p>Amount paid: <strong>TZS {lastReceipt.amount.toLocaleString('en-TZ')}</strong></p><p>Wallet balance after payment: <strong>TZS {lastReceipt.balance.toLocaleString('en-TZ')}</strong></p><p style={{overflowWrap:'anywhere',fontSize:13}}>Receipt reference: {lastReceipt.id}</p><p style={{fontSize:12}}></p></section>}
 {paymentMessage&&<p role="status">{paymentMessage}</p>}</Frame>;
}
function WalletAccountRoute({session,kind}:{session:Session;kind:'add-money'|'quick-loan'|'transfer-bank'|'transaction-status'|'transaction-otp'|'history'}){
 const [account,setAccount]=useState<string|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>{let active=true;void supabase?.from('pg_profiles').select('playgo_account').eq('user_id',session.user.id).maybeSingle().then(({data,error:lookupError})=>{
 if(!active)return;
 if(lookupError){setError('Unable to load PlayGo account: '+lookupError.message);return;}
 if(!data?.playgo_account){setError('PlayGo account number is not available. Please contact support.');return;}
 try{migrateLegacyDemoTopups(session.user.id,String(data.playgo_account));}catch{ /* Demo migration may be unavailable when browser storage is blocked. */ }
 setAccount(String(data.playgo_account));
 });return()=>{active=false;};},[session.user.id]);
 return <Frame>{error?<p className="pg-error" role="alert">{error}</p>:!account?<p>Loading your PlayGo wallet…</p>:kind==='add-money'?<AddMoneyPage account={account} supabase={supabase!} userId={session.user.id}/>:kind==='transfer-bank'?<BankTransferPage account={account} supabase={supabase!} userId={session.user.id}/>:kind==='transaction-status'?<TransactionStatus account={account}/>:kind==='transaction-otp'?<TransactionOtp account={account} findAccount={()=>undefined}/>:kind==='history'?<><Link to="/dashboard" className="pg-back">← Back to Home</Link><h1>Transaction History</h1><History account={account} supabase={supabase!} userId={session.user.id}/></>:<><Link to="/dashboard" className="pg-back">← Back to Home</Link><QuickLoan account={account}/></>}</Frame>;
}
export default function SecureApp() {
  const [session,setSession] = useState<Session | null>(null); const [loading,setLoading] = useState(true);
  useEffect(()=>{if (!supabase) return; void supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false);}); const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);setLoading(false);});return ()=>subscription.unsubscribe();},[]);
  if (!supabase) return <Frame><h1>Configuration required</h1><p>Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your local environment. Do not use a secret or service-role key.</p></Frame>;
  if (loading) return <Frame><p>Checking secure session…</p></Frame>;
  // Keep the registration result screen mounted after Supabase signs the new user in.
  const role=String(session?.user.app_metadata?.playgo_role||'student');
  const studentSession=role==='student'?session:null;
  const roleHome=role==='admin'?'/admin':role==='institution_admin'?'/institution':'/dashboard';
  return <Routes><Route path="/" element={session?<Navigate to={roleHome} replace/>:<Splash/>}/><Route path="/welcome" element={session?<Navigate to={roleHome} replace/>:<Welcome/>}/><Route path="/login" element={session?<Navigate to={roleHome} replace/>:<AuthForm register={false}/>}/><Route path="/register" element={<AuthForm register/>}/><Route path="/registration-success" element={studentSession?<RegistrationSuccess session={studentSession}/>:<Navigate to="/login" replace/>}/><Route path="/institution-request" element={studentSession?<StudentInstitutionRequest session={studentSession} supabase={supabase!}/>:<Navigate to="/login" replace/>}/><Route path="/institution/login" element={<InstitutionLogin supabase={supabase!} session={session}/>}/><Route path="/institution" element={session?<InstitutionPortal supabase={supabase!} session={session}/>:<Navigate to="/institution/login" replace/>}/><Route path="/admin/login" element={<AdminLogin supabase={supabase!}/>}/><Route path="/admin" element={session?<AdminPortal session={session} supabase={supabase!}/>:<Navigate to="/admin/login" replace/>}/><Route path="/dashboard" element={studentSession?<StudentWallet session={studentSession} tab="home"/>:<Navigate to="/login" replace/>}/><Route path="/merchant" element={studentSession?<StudentWallet session={studentSession} tab="merchant"/>:<Navigate to="/login" replace/>}/><Route path="/services" element={studentSession?<StudentWallet session={studentSession} tab="services"/>:<Navigate to="/login" replace/>}/><Route path="/government-loan" element={studentSession?<Frame><Link to="/services" className="pg-back">← Back to Services</Link><GovernmentStudentLoan/></Frame>:<Navigate to="/login" replace/>}/><Route path="/pay-fee" element={studentSession?<FeeInformation session={studentSession}/>:<Navigate to="/login" replace/>}/><Route path="/quick-loan" element={studentSession?<WalletAccountRoute session={studentSession} kind="quick-loan"/>:<Navigate to="/login" replace/>}/><Route path="/transfer-bank" element={studentSession?<WalletAccountRoute session={studentSession} kind="transfer-bank"/>:<Navigate to="/login" replace/>}/><Route path="/transfer" element={<Navigate to="/transfer-bank" replace/>}/><Route path="/transaction-otp" element={studentSession?<WalletAccountRoute session={studentSession} kind="transaction-otp"/>:<Navigate to="/login" replace/>}/><Route path="/transaction-status" element={studentSession?<WalletAccountRoute session={studentSession} kind="transaction-status"/>:<Navigate to="/login" replace/>}/><Route path="/history" element={studentSession?<WalletAccountRoute session={studentSession} kind="history"/>:<Navigate to="/login" replace/>}/><Route path="/add-money" element={studentSession?<WalletAccountRoute session={studentSession} kind="add-money"/>:<Navigate to="/login" replace/>}/><Route path="/profile" element={studentSession?<StudentWallet session={studentSession} tab="profile"/>:<Navigate to="/login" replace/>}/><Route path="*" element={<Navigate to={session?'/dashboard':'/'} replace/>}/></Routes>;
}
