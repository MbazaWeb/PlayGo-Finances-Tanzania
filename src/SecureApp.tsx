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
function AuthForm({ register }: { register: boolean }) {
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const navigate = useNavigate();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!supabase) return;
    const d = new FormData(e.currentTarget); const email = String(d.get('email') || '').trim(); const password = String(d.get('password') || '');
    setBusy(true); setMessage('');
    try {
      if (register) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Registration submitted. If email confirmation is enabled, check your inbox before logging in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/dashboard', { replace: true });
      }
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Authentication failed.'); } finally { setBusy(false); }
  }
  return <Frame><h1>{register ? 'Create student account' : 'Student Login'}</h1><p>Use your email address and a strong password. Demo PINs are not accepted.</p><form className="pg-form" onSubmit={submit}><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" required/><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={8} required/><button className="pg-button" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create account' : 'Log in'}</button>{message && <p role="status">{message}</p>}</form><p className="pg-switch">{register ? <>Already registered? <Link to="/login">Log in</Link></> : <>New student? <Link to="/register">Sign up</Link></>}</p></Frame>;
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
  return <Routes><Route path="/login" element={session?<Navigate to="/dashboard" replace/>:<AuthForm register={false}/>}/><Route path="/register" element={session?<Navigate to="/dashboard" replace/>:<AuthForm register/>}/><Route path="/dashboard" element={session?<Dashboard session={session}/>:<Navigate to="/login" replace/>}/><Route path="*" element={<Navigate to={session?'/dashboard':'/login'} replace/>}/></Routes>;
}
