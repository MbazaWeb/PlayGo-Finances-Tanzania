import {useEffect,useState,type FormEvent} from 'react';
import {Link,Navigate,useNavigate} from 'react-router-dom';
import type {Session,SupabaseClient} from '@supabase/supabase-js';
import './admin.css';

type Institution={id:string;name:string;code:string|null;email:string|null;phone:string|null;address:string|null;region:string|null;website:string|null;contact_person:string|null;admin_username:string|null};
type Section='dashboard'|'students'|'payments'|'profile';
function isInstitutionAdmin(session:Session|null){return session?.user.app_metadata?.playgo_role==='institution_admin'&&typeof session.user.app_metadata?.institution_id==='string';}

export function InstitutionLogin({supabase,session}:{supabase:SupabaseClient;session:Session|null}){
 const navigate=useNavigate();
 const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 if(isInstitutionAdmin(session))return <Navigate to="/institution" replace/>;
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError('');
  const result=await supabase.auth.signInWithPassword({email:email.trim().toLowerCase(),password});
  if(result.error){setError(result.error.message);setBusy(false);return;}
  const verified=await supabase.auth.getUser();
  if(verified.error||verified.data.user?.app_metadata?.playgo_role!=='institution_admin'||!verified.data.user.app_metadata.institution_id){
   await supabase.auth.signOut();setError('This account is not authorized for the Institution Portal.');setBusy(false);return;
  }
  navigate('/institution',{replace:true});setBusy(false);
 }
 return <main className="pg-page"><section className="pg-panel" style={{maxWidth:480,margin:'5vh auto'}}>
  <img src="/branding/playgo-white.png" alt="PlayGo" style={{width:130,maxWidth:'100%'}}/>
  <p className="pg-eyebrow">PLAYGO · INSTITUTION ACCESS</p><h1>Institution Login</h1>
  <p>Sign in with the institution administrator credentials provided by PlayGo Platform Admin.</p>
  <form className="pg-form" onSubmit={submit}><label htmlFor="inst-email">Administrator email</label><input id="inst-email" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/>
  <label htmlFor="inst-password">Password</label><input id="inst-password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/>
  <button className="pg-button" disabled={busy}>{busy?'Signing in…':'Sign in to Institution Portal'}</button>
  {error&&<p className="pg-error" role="alert">{error}</p>}</form><p><Link to="/login">Student login</Link></p>
 </section></main>;
}
export default function InstitutionPortal({supabase,session}:{supabase:SupabaseClient;session:Session}){
 const navigate=useNavigate();const [section,setSection]=useState<Section>('dashboard');const [institution,setInstitution]=useState<Institution|null>(null);const [error,setError]=useState('');const [loading,setLoading]=useState(true);
 const institutionId=String(session.user.app_metadata?.institution_id||'');
 const allowed=isInstitutionAdmin(session);
 useEffect(()=>{if(!allowed)return;let active=true;
  void (async()=>{const {data,error:e}=await supabase.from('pg_institutions').select('id,name,code,email,phone,address,region,website,contact_person,admin_username').eq('id',institutionId).eq('admin_user_id',session.user.id).maybeSingle();
   if(!active)return;
   if(e)setError('Unable to load institution profile: '+e.message);
   else if(!data)setError('Your administrator account is not linked to an active institution.');
   else setInstitution(data as Institution);
   setLoading(false);
  })();return()=>{active=false;};
 },[supabase,institutionId,session.user.id,allowed]);
 if(!allowed)return <Navigate to="/institution/login" replace/>;
 async function logout(){await supabase.auth.signOut();navigate('/institution/login',{replace:true});}
 const sections:[Section,string][]=[['dashboard','Dashboard'],['students','Students'],['payments','Payments'],['profile','Institution Profile']];
 return <div className="pga-shell" style={{minHeight:'100vh'}}>
  <aside className="pga-sidebar"><div style={{padding:'24px 20px'}}><strong>PLAYGO</strong><p style={{fontSize:12,opacity:.75}}>INSTITUTION PORTAL</p></div><nav aria-label="Institution navigation">
  {sections.map(([id,title])=><button key={id} type="button" className={section===id?'pga-nav-active':''} onClick={()=>setSection(id)} style={{display:'block',width:'100%',textAlign:'left',padding:'14px 24px',border:0,background:section===id?'#263244':'transparent',color:'white',cursor:'pointer'}}>{title}</button>)}
  </nav><button type="button" onClick={logout} style={{margin:24,padding:10,cursor:'pointer'}}>Sign out</button></aside>
  <main className="pga-main" style={{padding:'36px',minWidth:0}}>
   {loading?<p>Loading institution…</p>:error?<p role="alert" className="pg-error">{error}</p>:institution&&<>
    <div className="pga-heading"><div><p style={{opacity:.65}}>Institution Workspace</p><h1>{institution.name}</h1><p>Signed in as {session.user.email}</p></div></div>
    {section==='dashboard'&&<><h2>Dashboard</h2><div className="pga-card"><h3>Welcome to your institution dashboard</h3><p>Your account is linked to {institution.name}. This workspace is restricted to your institution.</p><p>Student enrollment management and payment reporting will be enabled after institution-scoped access policies and workflows are configured.</p></div></>}
    {section==='students'&&<><h2>Students</h2><div className="pga-card"><p>Student enrollment management is being prepared. Student records will only be displayed after institution-specific authorization is enabled.</p></div></>}
    {section==='payments'&&<><h2>Payments</h2><div className="pga-card"><p>No real payment processing is available. PlayGo transactions are demonstrations until an approved banking integration is operational.</p></div></>}
    {section==='profile'&&<><h2>Institution Profile</h2><div className="pga-card"><dl>{([['Institution',institution.name],['Code',institution.code],['Email',institution.email],['Phone',institution.phone],['Region',institution.region],['Address',institution.address],['Website',institution.website],['Contact person',institution.contact_person],['Admin username',institution.admin_username]] as [string,string|null][]).map(([key,value])=><div key={key} style={{padding:'10px 0',borderBottom:'1px solid #e5e7eb'}}><dt style={{fontWeight:700}}>{key}</dt><dd style={{margin:0}}>{value||'Not provided'}</dd></div>)}</dl></div></>}
   </>}
  </main>
 </div>;
}
