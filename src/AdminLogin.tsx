import {useState,type FormEvent} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import type {SupabaseClient} from '@supabase/supabase-js';
import './styles.css';
export default function AdminLogin({supabase}:{supabase:SupabaseClient}){
 const navigate=useNavigate();const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setError('');setBusy(true);
  const {data,error:loginError}=await supabase.auth.signInWithPassword({email:email.trim(),password});
  if(loginError||!data.user){setError(loginError?.message||'Unable to sign in.');setBusy(false);return;}
  const {data:verified,error:checkError}=await supabase.auth.getUser();
  if(checkError||verified.user?.app_metadata?.playgo_role!=='admin'){setError('This account does not have PlayGo administrator access. Contact the platform owner.');setBusy(false);return;}
  setBusy(false);navigate('/admin',{replace:true});
 }
 return <main className="pg-page"><section className="pg-panel" style={{maxWidth:480,margin:'5vh auto'}}>
  <img src="/branding/playgo-white.png" alt="PlayGo Tanzania Limited" style={{width:130,maxWidth:'100%'}}/>
  <p className="pg-eyebrow">PLAYGO · ADMIN ACCESS</p>
  <h1>Administrator Login</h1>
  <p>Sign in with your authorized PlayGo platform administrator credentials.</p>
  <form className="pg-form" onSubmit={submit}>
   <label htmlFor="pga-email">Administrator email</label>
   <input id="pga-email" type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required/>
   <label htmlFor="pga-password">Password</label>
   <input id="pga-password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/>
   <button className="pg-button" type="submit" disabled={busy}>{busy?'Checking access…':'Sign in to Admin Portal'}</button>
   {error&&<p className="pg-error" role="alert">{error}</p>}
  </form>
  <p><Link to="/login">Student login</Link></p>
 </section></main>;
}
