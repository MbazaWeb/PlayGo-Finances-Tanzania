import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { createClient, type Session } from '@supabase/supabase-js';
import './styles.css';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const supabase = url && key ? createClient(url, key, { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } }) : null;
const logo = '/branding/playgo-white.png';

type Profile = { user_id: string; full_name: string; playgo_account: string | null };
type Enrollment = { id: string; institution_id: string; admission_number: string; active: boolean };
type Institution = { id: string; name: string };
type Year = { id: string; institution_id: string; label: string; structure: string };
type Installment = { id: string; academic_year_id: string; installment_number: number; amount_tzs: number; due_date: string };

function Frame({ children }: { children: React.ReactNode }) { return <main className="pg-page"><section className="pg-panel"><img className="pg-logo pg-small" src={logo} alt="PlayGo"/><p className="pg-eyebrow">PLAYGO FINANCES · SECURE ACCESS</p>{children}<p className="pg-note">NMB integration pending approval. Real payments are disabled.</p></section></main>; }
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
  return <Frame><div style={{textAlign:'center',padding:'18px 0'}} aria-live="polite">
    <p className="pg-eyebrow">REGISTRATION VERIFICATION · STEP 3 OF 3</p>
    <h1>{failure ? 'Registration check failed' : running ? 'Checking your registration…' : 'Registration verified!'}</h1>
    <div role="progressbar" aria-label="Registration verification progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} style={{height:16,borderRadius:12,background:'#eeeeee',overflow:'hidden',margin:'20px 0 8px'}}>
      <div style={{height:'100%',width:progress+'%',background:failure?'#d32f2f':'#d32f2f',transition:'width .35s ease'}}/>
    </div>
    <p style={{fontSize:22,fontWeight:700}}>{progress}%</p>
    <p>{failure ? 'Verification stopped at the failed check.' : step}</p>
    <div className="pg-details">
      <p><strong>{progress >= 25 ? '✓' : '○'} OTP demonstration</strong><span>Demo only · not SMS verified</span></p>
      <p><strong>{progress >= 50 ? '✓' : failure ? '✕' : '○'} Authentication session</strong><span>{progress >= 50 ? 'Passed' : failure ? 'Failed' : 'Checking'}</span></p>
      <p><strong>{progress >= 75 ? '✓' : failure && progress === 50 ? '✕' : '○'} Student profile</strong><span>{progress >= 75 ? 'Passed' : failure && progress === 50 ? 'Failed' : 'Pending'}</span></p>
      <p><strong>{progress === 100 ? '✓' : failure && progress === 75 ? '✕' : '○'} Account number</strong><span>{progress === 100 ? 'Verified' : failure && progress === 75 ? 'Failed' : 'Pending'}</span></p>
    </div>
    {failure && <p className="pg-error" role="alert">{failure}</p>}
    {account && <div className="pg-details"><p><strong>Verified PlayGo Account Number</strong><span style={{fontSize:24,fontWeight:700,letterSpacing:2}}>{account}</span></p></div>}
    {failure && <button type="button" className="pg-button pg-outline" onClick={()=>setAttempt(n=>n+1)}>Retry verification</button>}
    {!running && !failure && <Link className="pg-button" to="/dashboard">Continue to Dashboard →</Link>}
    <p className="pg-note">Checks reflect actual Supabase responses. Institution enrollment and phone ownership are not yet verified. Real payments are disabled.</p>
  </div></Frame>;
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
export default function SecureApp() {
  const [session,setSession] = useState<Session | null>(null); const [loading,setLoading] = useState(true);
  useEffect(()=>{if (!supabase) return; void supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false);}); const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);setLoading(false);});return ()=>subscription.unsubscribe();},[]);
  if (!supabase) return <Frame><h1>Configuration required</h1><p>Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your local environment. Do not use a secret or service-role key.</p></Frame>;
  if (loading) return <Frame><p>Checking secure session…</p></Frame>;
  // Keep the registration result screen mounted after Supabase signs the new user in.
  return <Routes><Route path="/" element={session?<Navigate to="/dashboard" replace/>:<Splash/>}/><Route path="/welcome" element={session?<Navigate to="/dashboard" replace/>:<Welcome/>}/><Route path="/login" element={session?<Navigate to="/dashboard" replace/>:<AuthForm register={false}/>}/><Route path="/register" element={<AuthForm register/>}/><Route path="/registration-success" element={session?<RegistrationSuccess session={session}/>:<Navigate to="/login" replace/>}/><Route path="/dashboard" element={session?<Dashboard session={session}/>:<Navigate to="/login" replace/>}/><Route path="*" element={<Navigate to={session?'/dashboard':'/'} replace/>}/></Routes>;
}
