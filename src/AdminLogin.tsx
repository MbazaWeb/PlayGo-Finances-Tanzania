import {useState,type FormEvent} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import type {SupabaseClient} from '@supabase/supabase-js';
import './admin.css';
export default function AdminLogin({supabase}:{supabase:SupabaseClient}){
 const navigate=useNavigate();const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setError('');setBusy(true);
  const {data,error:loginError}=await supabase.auth.signInWithPassword({email:email.trim(),password});
  if(loginError||!data.user){setError(loginError?.message||'Unable to sign in.');setBusy(false);return;}
  const {data:verified,error:checkError}=await supabase.auth.getUser();
  if(checkError||verified.user?.app_metadata?.playgo_role!=='admin'){setError('This account does not have PlayGo administrator access. Contact the platform owner.');setBusy(false);return;}
  setBusy(false);navigate('/admin',{replace:true});
 }
 return <main className="pga-login-page"><section className="pga-login-card"><div className="pga-login-logo">Play<b>Go</b><small>ADMIN PORTAL</small></div><h1>Administrator Sign In</h1><p>Sign in with an authorized PlayGo administrator account to access the web console.</p><form onSubmit={submit}><label htmlFor="pga-email">Admin email</label><input id="pga-email" type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="admin@example.com"/><label htmlFor="pga-password">Password</label><input id="pga-password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required placeholder="Enter your password"/>{error&&<p className="pga-alert" role="alert">{error}</p>}<button className="pga-primary" type="submit" disabled={busy}>{busy?'Checking access…':'Sign In to Admin Portal →'}</button></form><p className="pga-login-footer"><Link to="/dashboard">← Return to Student Portal</Link></p></section></main>;
}
