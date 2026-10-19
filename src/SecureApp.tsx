import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { createClient, type Session } from '@supabase/supabase-js';
import './styles.css';
import { MerchantPage } from './Merchant';
import { ServicesPage, QuickLoan, GovernmentStudentLoan } from './Services';
import { WalletSummary, LinkedAccounts, AddMoneyPage, BankTransferPage, migrateLegacyDemoTopups } from './Wallet';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const supabase = url && key ? createClient(url, key, { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } }) : null;
const logo = '/branding/playgo-white.png';

type Profile = { user_id: string; full_name: string; playgo_account: string | null };
type Enrollment = { id: string; institution_id: string; admission_number: string; active: boolean };
type Institution = { id: string; name: string };
type Year = { id: string; institution_id: string; label: string; structure: string };
type Installment = { id: string; academic_year_id: string; installment_number: number; amount_tzs: number; due_date: string };

function Frame({ children }: { children: React.ReactNode }) { return <main className="pg-page"><section className="pg-panel"><div className="pg-subpage-brand"><img className="pg-logo pg-small" src={logo} alt="PlayGo"/></div>{children}<p className="pg-note">NMB integration pending approval. Real payments are disabled.</p></section></main>; }
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
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [registrationPercent, setRegistrationPercent] = useState(0); const [registrationCheck, setRegistrationCheck] = useState(''); const [checking, setChecking] = useState(false); const [registrationFailure, setRegistrationFailure] = useState(''); const [otpStep, setOtpStep] = useState(false); const [demoCode, setDemoCode] = useState(''); const [enteredCode, setEnteredCode] = useState(''); const [draft, setDraft] = useState<Record<string,string> | null>(null); const navigate = useNavigate();
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
    if (register && !otpStep) { const code = String(Math.floor(100000 + Math.random() * 900000)); setDemoCode(code); setEnteredCode(''); setDraft(Object.fromEntries(d.entries()) as Record<string,string>); setOtpStep(true); setMessage(''); return; }
    if (register && (enteredCode !== demoCode || !draft)) { setMessage('Incorrect demonstration code.'); return; }
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
  if (register && checking) return <Frame><p className="pg-eyebrow">REGISTRATION VERIFICATION · STEP 3 OF 3</p><h1>{registrationFailure ? 'Registration check failed' : 'Checking your registration…'}</h1><div role="progressbar" aria-label="Registration progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={registrationPercent} style={{height:16,borderRadius:12,background:'#eee',overflow:'hidden',margin:'18px 0'}}><div style={{height:'100%',width:registrationPercent+'%',background:'#d32f2f',transition:'width .4s ease'}}/></div><h2>{registrationPercent}%</h2><p aria-live="polite">{registrationCheck}</p><div className="pg-details"><p><strong>{registrationPercent>=10?'✓':'○'} OTP demonstration</strong><span>Test only</span></p><p><strong>{registrationPercent>=35?'✓':'○'} University directory</strong><span>{registrationPercent>=35?'Found':'Checking'}</span></p><p><strong>{registrationPercent>=55?'✓':'○'} Admission number format</strong><span>{registrationPercent>=55?'Recorded, not university verified':'Pending'}</span></p><p><strong>{registrationPercent>=85?'✓':'○'} Account creation</strong><span>{registrationPercent>=85?'Created':'Pending'}</span></p></div>{registrationFailure && <><p role="alert" className="pg-error">{registrationFailure}</p><button className="pg-button pg-outline" type="button" onClick={()=>{setChecking(false);setRegistrationFailure('');}}>Back to OTP</button></>}<p className="pg-note">No official university enrollment or SMS ownership verification is available. Real payments remain disabled.</p></Frame>;
  if (register && otpStep) return <Frame><h1>OTP demonstration</h1><p>Step 2 of 3 — Confirm the simulated code before account creation.</p><p className="pg-note"><strong>Testing only.</strong> No SMS is sent. This does not verify ownership of your mobile number and must not be used as financial identity verification.</p><div className="pg-details"><p><strong>Demo code (shown on screen)</strong><span style={{fontSize:24,letterSpacing:3}}>{demoCode}</span></p></div><form className="pg-form" onSubmit={submit}><label htmlFor="demo-otp">Enter the 6-digit demo code</label><input id="demo-otp" type="text" inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" maxLength={6} value={enteredCode} onChange={e=>setEnteredCode(e.target.value.replace(/[^0-9]/g,'').slice(0,6))} required/><button className="pg-button" disabled={busy}>{busy ? 'Creating account…' : 'Confirm demo code & create account'}</button>{registrationPercent > 0 && <div aria-live="polite"><p><strong>{registrationPercent}%</strong> — {registrationCheck}</p><div role="progressbar" aria-valuenow={registrationPercent} aria-valuemin={0} aria-valuemax={100} style={{height:12,background:'#eee',borderRadius:8,overflow:'hidden'}}><div style={{width:registrationPercent+'%',height:'100%',background:'#d32f2f',transition:'width .3s'}} /></div></div>}{message && <p role="alert">{message}</p>}</form><button className="pg-button pg-outline" type="button" disabled={busy} onClick={()=>{setOtpStep(false);setDraft(null);setMessage('');}}>Back to registration</button></Frame>;
  return <Frame><h1>{register ? 'Create student account' : 'Student Login'}</h1><p>{register ? 'Step 1 of 3 — Enter student details. The next step is an OTP simulation; no SMS will be sent.' : 'Use your email address and password. Demo PINs are not accepted.'}</p>
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
      <button className="pg-button" disabled={busy}>{busy ? 'Please wait…' : register ? 'Continue to OTP demo →' : 'Log in'}</button>
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
    { title: 'OTP demonstration', detail: 'Demo only · SMS not verified', passed: true, failed: false },
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
    <p className="pg-note" style={{fontSize:11,lineHeight:1.5,textAlign:'center',marginTop:18}}>University enrollment and mobile ownership are not yet independently verified. Real payments remain disabled.</p>
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
  return <Frame><h1>Hello, {profile?.full_name || 'Student'}!</h1><p>Signed in as {session.user.email}</p><div className="pg-details"><p><strong>PlayGo Account</strong><span>{profile?.playgo_account || 'Pending provisioning'}</span></p><p><strong>Banking</strong><span>Not connected</span></p><p><strong>Real payments</strong><span>Disabled</span></p></div><h2>My institutions</h2>{enrollments.length ? enrollments.map(e=><p key={e.id}>{institutions.find(i=>i.id===e.institution_id)?.name || 'Institution'} · {e.admission_number} · {e.active ? 'Active' : 'Inactive'}</p>) : <p>No verified institution enrollment yet. Contact your institution administrator.</p>}<h2>Published fee schedules</h2>{years.length ? years.map(y=><div key={y.id}><strong>{institutions.find(i=>i.id===y.institution_id)?.name} — {y.label}</strong>{installments.filter(t=>t.academic_year_id===y.id).map(t=><p key={t.id}>Installment {t.installment_number}: TZS {Number(t.amount_tzs).toLocaleString()} · Due {t.due_date}</p>)}</div>) : <p>No published schedules available.</p>}{error && <p className="pg-error" role="alert">{error}</p>}<button className="pg-button pg-outline" onClick={()=>void supabase?.auth.signOut()}>Log out</button></Frame>;
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
 {tab==='home'&&<><h1>Hello, {(profile?.full_name||'Student').split(' ')[0]}!</h1><p>Welcome to your student wallet.</p>{account?<><WalletSummary account={account} fullName={profile?.full_name||'Student'} institution={institution}/><div className="pg-feature-card" style={{marginTop:16}}><div className="pg-services-heading"><h2>Personal Boost Loan</h2><span>Demo</span></div><p>Wallet running low? Request emergency student funding.</p><Link className="pg-button" to="/quick-loan">⚡ Request Personal Boost →</Link><p className="pg-note">No lender connected. No instant cash or wallet credit is available.</p></div></>:<p>Loading your PlayGo account…</p>}</>}
 {tab==='merchant'&&(account?<MerchantPage account={account}/>:<p>Loading account…</p>)}
 {tab==='services'&&(account?<ServicesPage account={account} institution={institution}/>:<p>Loading account…</p>)}
 {tab==='profile'&&<><h1>My Profile</h1><div className="pg-details"><p><strong>Full name</strong><span>{profile?.full_name||'Loading…'}</span></p><p><strong>Account number</strong><span>{account||'Pending'}</span></p><p><strong>Institution</strong><span>{institution}</span></p><p><strong>Admission number</strong><span>{admission}</span></p><p><strong>Email</strong><span style={{overflowWrap:'anywhere'}}>{session.user.email}</span></p><p><strong>University verification</strong><span>Pending</span></p></div><section style={{margin:'22px 0',border:'1px solid #e5e5e5',borderRadius:16,padding:16}}>
 <h2 style={{marginTop:0}}>Course Admitted & Fees</h2>
 <p className="pg-note">Course selection is student-declared, not yet verified by the university.</p>
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
 <p className="pg-note">Wallet, merchant and services are browser-based demonstrations only. No real payments or banking connections.</p>
 </section><nav className="pg-bottom-nav" aria-label="Student navigation">{tabs.map(([key,title,icon,path])=><Link key={key} to={path} className={'pg-nav-item'+(tab===key?' pg-nav-active':'')} aria-current={tab===key?'page':undefined}><span className="pg-nav-icon" aria-hidden="true">{icon}</span><span>{title}</span></Link>)}</nav></main>;
}
function WalletAccountRoute({session,kind}:{session:Session;kind:'add-money'|'quick-loan'|'transfer-bank'}){
 const [account,setAccount]=useState<string|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>{let active=true;void supabase?.from('pg_profiles').select('playgo_account').eq('user_id',session.user.id).maybeSingle().then(({data,error:lookupError})=>{
 if(!active)return;
 if(lookupError){setError('Unable to load PlayGo account: '+lookupError.message);return;}
 if(!data?.playgo_account){setError('PlayGo account number is not available. Please contact support.');return;}
 try{migrateLegacyDemoTopups(session.user.id,String(data.playgo_account));}catch{ /* Demo migration may be unavailable when browser storage is blocked. */ }
 setAccount(String(data.playgo_account));
 });return()=>{active=false;};},[session.user.id]);
 return <Frame>{error?<p className="pg-error" role="alert">{error}</p>:!account?<p>Loading your PlayGo wallet…</p>:kind==='add-money'?<AddMoneyPage account={account} supabase={supabase!} userId={session.user.id}/>:kind==='transfer-bank'?<BankTransferPage account={account} supabase={supabase!} userId={session.user.id}/>:<><Link to="/dashboard" className="pg-back">← Back to Home</Link><QuickLoan account={account}/></>}</Frame>;
}
export default function SecureApp() {
  const [session,setSession] = useState<Session | null>(null); const [loading,setLoading] = useState(true);
  useEffect(()=>{if (!supabase) return; void supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false);}); const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);setLoading(false);});return ()=>subscription.unsubscribe();},[]);
  if (!supabase) return <Frame><h1>Configuration required</h1><p>Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your local environment. Do not use a secret or service-role key.</p></Frame>;
  if (loading) return <Frame><p>Checking secure session…</p></Frame>;
  // Keep the registration result screen mounted after Supabase signs the new user in.
  return <Routes><Route path="/" element={session?<Navigate to="/dashboard" replace/>:<Splash/>}/><Route path="/welcome" element={session?<Navigate to="/dashboard" replace/>:<Welcome/>}/><Route path="/login" element={session?<Navigate to="/dashboard" replace/>:<AuthForm register={false}/>}/><Route path="/register" element={<AuthForm register/>}/><Route path="/registration-success" element={session?<RegistrationSuccess session={session}/>:<Navigate to="/login" replace/>}/><Route path="/dashboard" element={session?<StudentWallet session={session} tab="home"/>:<Navigate to="/login" replace/>}/><Route path="/merchant" element={session?<StudentWallet session={session} tab="merchant"/>:<Navigate to="/login" replace/>}/><Route path="/services" element={session?<StudentWallet session={session} tab="services"/>:<Navigate to="/login" replace/>}/><Route path="/government-loan" element={session?<Frame><Link to="/services" className="pg-back">← Back to Services</Link><GovernmentStudentLoan/></Frame>:<Navigate to="/login" replace/>}/><Route path="/quick-loan" element={session?<WalletAccountRoute session={session} kind="quick-loan"/>:<Navigate to="/login" replace/>}/><Route path="/transfer-bank" element={session?<WalletAccountRoute session={session} kind="transfer-bank"/>:<Navigate to="/login" replace/>}/><Route path="/transfer" element={<Navigate to="/transfer-bank" replace/>}/><Route path="/add-money" element={session?<WalletAccountRoute session={session} kind="add-money"/>:<Navigate to="/login" replace/>}/><Route path="/profile" element={session?<StudentWallet session={session} tab="profile"/>:<Navigate to="/login" replace/>}/><Route path="*" element={<Navigate to={session?'/dashboard':'/'} replace/>}/></Routes>;
}
