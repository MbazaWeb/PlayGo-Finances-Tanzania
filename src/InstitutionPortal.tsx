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

type EnrollmentRow={id:string;user_id:string;admission_number:string;active:boolean};
type ProfileRow={user_id:string;full_name:string};
type AcademicYear={id:string;label:string;structure:string;published:boolean};
type InstallmentRow={id:string;academic_year_id:string;installment_number:number;amount_tzs:number;due_date:string};
type DemoTransaction={id:string;user_id:string;kind:string;amount_tzs:number;created_at:string;note:string|null};
const money=(value:number)=>'TZS '+Number(value||0).toLocaleString('en-TZ');
const navItems:{id:Section;label:string;icon:string}[]=[
 {id:'dashboard',label:'Dashboard',icon:'▦'},
 {id:'students',label:'Students',icon:'♙'},
 {id:'payments',label:'Payments',icon:'▤'},
 {id:'profile',label:'Institution Profile',icon:'⚙'}
];
const card:React.CSSProperties={background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:24,boxShadow:'0 4px 20px #15243a05'};
const action:React.CSSProperties={background:'#e32235',color:'white',border:0,borderRadius:9,padding:'12px 18px',cursor:'pointer',fontWeight:700};
const muted:React.CSSProperties={color:'#7c8795',fontSize:13};
export default function InstitutionPortal({supabase,session}:{supabase:SupabaseClient;session:Session}){
 const navigate=useNavigate();
 const [section,setSection]=useState<Section>('dashboard');
 const [institution,setInstitution]=useState<Institution|null>(null);
 const [enrollments,setEnrollments]=useState<EnrollmentRow[]>([]);
 const [profiles,setProfiles]=useState<ProfileRow[]>([]);
 const [years,setYears]=useState<AcademicYear[]>([]);
 const [installments,setInstallments]=useState<InstallmentRow[]>([]);
 const [transactions,setTransactions]=useState<DemoTransaction[]>([]);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [loading,setLoading]=useState(true);
 const [busyId,setBusyId]=useState('');
 const [search,setSearch]=useState('');
 const [filter,setFilter]=useState('all');
 const institutionId=String(session.user.app_metadata?.institution_id||'');
 const allowed=isInstitutionAdmin(session);
 async function refresh(){
  const inst=await supabase.from('pg_institutions').select('id,name,code,email,phone,address,region,website,contact_person,admin_username').eq('id',institutionId).eq('admin_user_id',session.user.id).maybeSingle();
  if(inst.error)throw new Error(inst.error.message);
  if(!inst.data)throw new Error('This account is not linked to an institution.');
  setInstitution(inst.data as Institution);
  const [en,yr]=await Promise.all([
   supabase.from('pg_enrollments').select('id,user_id,admission_number,active').eq('institution_id',institutionId).order('admission_number'),
   supabase.from('pg_academic_years').select('id,label,structure,published').eq('institution_id',institutionId)
  ]);
  if(en.error||yr.error)throw new Error(en.error?.message||yr.error?.message||'Data unavailable');
  const enrolled=(en.data||[]) as EnrollmentRow[];
  const academic=(yr.data||[]) as AcademicYear[];
  setEnrollments(enrolled);setYears(academic);
  const ids=[...new Set(enrolled.map(e=>e.user_id))];
  const yearIds=academic.map(y=>y.id);
  const [p,i,t]=await Promise.all([
   ids.length?supabase.from('pg_profiles').select('user_id,full_name').in('user_id',ids):Promise.resolve({data:[],error:null}),
   yearIds.length?supabase.from('pg_installments').select('id,academic_year_id,installment_number,amount_tzs,due_date').in('academic_year_id',yearIds).order('due_date'):Promise.resolve({data:[],error:null}),
   ids.length?supabase.from('pg_demo_transactions').select('id,user_id,kind,amount_tzs,created_at,note').in('user_id',ids).order('created_at',{ascending:false}).limit(100):Promise.resolve({data:[],error:null})
  ]);
  if(p.error||i.error||t.error)throw new Error(p.error?.message||i.error?.message||t.error?.message||'Unable to load records');
  setProfiles((p.data||[]) as ProfileRow[]);setInstallments((i.data||[]) as InstallmentRow[]);setTransactions((t.data||[]) as DemoTransaction[]);
 }
 useEffect(()=>{if(!allowed)return;let mounted=true;
  void refresh().catch(e=>{if(mounted)setError(e instanceof Error?e.message:'Unable to load institution data');}).finally(()=>{if(mounted)setLoading(false);});
  return()=>{mounted=false;};
 },[supabase,institutionId,session.user.id,allowed]);
 if(!allowed)return <Navigate to="/institution/login" replace/>;
 async function logout(){await supabase.auth.signOut();navigate('/institution/login',{replace:true});}
 async function changeStatus(enrollment:EnrollmentRow){
  setBusyId(enrollment.id);setNotice('');
  const {data,error:e}=await supabase.from('pg_enrollments').update({active:!enrollment.active}).eq('id',enrollment.id).eq('institution_id',institutionId).select('id,active').single();
  if(e||!data){setNotice('Update failed: '+(e?.message||'No enrollment updated'));setBusyId('');return;}
  setEnrollments(old=>old.map(x=>x.id===enrollment.id?{...x,active:data.active}:x));
  setNotice('Student enrollment status updated.');setBusyId('');
 }
 const names=new Map(profiles.map(p=>[p.user_id,p.full_name]));
 const activeCount=enrollments.filter(e=>e.active).length;
 const visible=enrollments.filter(e=>{
  const text=(names.get(e.user_id)||'')+' '+e.admission_number;
  return text.toLowerCase().includes(search.trim().toLowerCase())&&(filter==='all'||(filter==='active'?e.active:!e.active));
 });
 const totalFees=installments.reduce((sum,i)=>sum+Number(i.amount_tzs||0),0);
 const heading=navItems.find(n=>n.id===section)?.label||'Dashboard';
 return <div className="pga-app">
  <aside className="pga-side">
   <div className="pga-brand"><span>Play<b>Go</b></span><small>INSTITUTION CONSOLE</small></div>
   <p className="pga-nav-title">WORKSPACE</p>
   <nav aria-label="Institution navigation">{navItems.map(item=><button key={item.id} type="button" className={section===item.id?'active':''} onClick={()=>{setSection(item.id);setNotice('');}}><span aria-hidden="true">{item.icon}</span>{item.label}</button>)}</nav>
   <div className="pga-side-bottom"><span className="pga-dot"/> Demo finance environment <button type="button" className="pga-institution-signout" onClick={()=>void logout()}>Sign out ↗</button></div>
  </aside>
  <div className="pga-main">
   <header className="pga-top"><div><span className="pga-crumb">PlayGo / Institution / {heading}</span><h1>{heading}</h1></div><div className="pga-user"><span className="pga-avatar">{(institution?.name||'I').charAt(0)}</span><div><b>{institution?.name||'Institution Administrator'}</b><small>{session.user.email}</small></div></div></header>
   <div className="pga-body">
   {loading?<div style={card}>Loading institution data…</div>:error?<div role="alert" style={{...card,color:'#b42318'}}>{error}<p><button style={action} onClick={()=>{setError('');setLoading(true);void refresh().catch(e=>setError(String(e))).finally(()=>setLoading(false));}}>Retry</button></p></div>:institution&&<>
    {notice&&<p role="status" style={{...card,borderColor:'#bbd7f2'}}>{notice}</p>}
    {section==='dashboard'&&<>
     <h2 style={{fontSize:21,margin:'0 0 6px'}}>Welcome, {institution.name}</h2><p style={{...muted,marginBottom:24}}>Overview of your institution's students and published fee information.</p>
     <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:16,marginBottom:22}}>
      {([['Total Enrollments',enrollments.length],['Active Students',activeCount],['Inactive Students',enrollments.length-activeCount],['Academic Years',years.length]] as [string,number][]).map(([label,value])=><div key={label} style={card}><div style={muted}>{label}</div><strong style={{fontSize:34,display:'block',marginTop:14}}>{value}</strong></div>)}
     </div>
     <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(290px,1fr))',gap:18}}>
      <section style={card}><h3>Student Management</h3><p style={muted}>Review enrollment details and activate or deactivate institution enrollments.</p><button style={action} onClick={()=>setSection('students')}>Manage Students →</button></section>
      <section style={card}><h3>Fee & Payment Overview</h3><p><strong>{money(totalFees)}</strong> total scheduled installment amounts (not collected revenue).</p><p style={muted}>{installments.length} installments · {transactions.length} recent demo records</p><button style={action} onClick={()=>setSection('payments')}>View Payments →</button></section>
     </div>
    </>}
    {section==='students'&&<section style={card}>
     <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap',alignItems:'center'}}><div><h2 style={{margin:'0 0 6px'}}>Registered Students</h2><p style={muted}>Only enrollments linked to {institution.name} appear here.</p></div><strong>{visible.length} records</strong></div>
     <div style={{display:'flex',gap:10,flexWrap:'wrap',margin:'20px 0'}}><input aria-label="Search students" placeholder="Search name or admission number" value={search} onChange={e=>setSearch(e.target.value)} style={{flex:'1 1 230px',padding:11,border:'1px solid #d7deeb',borderRadius:8}}/><select aria-label="Filter enrollment status" value={filter} onChange={e=>setFilter(e.target.value)} style={{padding:11,border:'1px solid #d7deeb',borderRadius:8}}><option value="all">All students</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
     <div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',minWidth:590}}><thead><tr style={{textAlign:'left',background:'#f5f7fb'}}>{['Student','Admission Number','Enrollment Status','Action'].map(h=><th key={h} style={{padding:14}}>{h}</th>)}</tr></thead><tbody>{visible.map(e=><tr key={e.id} style={{borderTop:'1px solid #e9edf3'}}><td style={{padding:14,fontWeight:600}}>{names.get(e.user_id)||'Name unavailable'}</td><td style={{padding:14}}>{e.admission_number}</td><td style={{padding:14,color:e.active?'#087647':'#9a6700'}}>{e.active?'Active':'Inactive'}</td><td style={{padding:14}}><button type="button" disabled={busyId===e.id} onClick={()=>void changeStatus(e)} style={{...action,padding:'8px 12px',background:e.active?'#667386':'#e32235'}}>{busyId===e.id?'Saving…':e.active?'Deactivate':'Activate'}</button></td></tr>)}</tbody></table>{!visible.length&&<p style={muted}>No matching student enrollments.</p>}</div>
    </section>}
    {section==='payments'&&<div style={{display:'grid',gap:20}}>
     <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:14}}><div style={card}><div style={muted}>Scheduled Fees</div><strong style={{fontSize:23}}>{money(totalFees)}</strong></div><div style={card}><div style={muted}>Fee Installments</div><strong style={{fontSize:28}}>{installments.length}</strong></div><div style={card}><div style={muted}>Recent Demo Transactions</div><strong style={{fontSize:28}}>{transactions.length}</strong></div></div>
     <section style={card}><h2>Academic Years & Fee Schedule</h2><p style={muted}>Published schedules are visible to enrolled students. Figures below represent scheduled amounts, not confirmed payments.</p><div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',minWidth:570}}><thead><tr style={{textAlign:'left'}}>{['Academic Year','Installment','Amount','Due Date','Year Status'].map(h=><th key={h} style={{padding:12,borderBottom:'1px solid #ddd'}}>{h}</th>)}</tr></thead><tbody>{installments.map(i=>{const y=years.find(x=>x.id===i.academic_year_id);return <tr key={i.id}><td style={{padding:12}}>{y?.label||'Unknown year'}</td><td style={{padding:12}}>{i.installment_number}</td><td style={{padding:12}}>{money(i.amount_tzs)}</td><td style={{padding:12}}>{i.due_date}</td><td style={{padding:12}}>{y?.published?'Published':'Draft'}</td></tr>;})}</tbody></table>{!installments.length&&<p style={muted}>No fee installments configured yet.</p>}</div></section>
     <section style={card}><h2>Demo Transaction History</h2><p style={{...muted}}>Demonstration transactions by users with an enrollment at this institution. These are not verified tuition payments. Showing the latest 100 records.</p><div style={{overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',minWidth:650}}><thead><tr style={{textAlign:'left'}}>{['Date','Student','Type','Amount','Note'].map(h=><th key={h} style={{padding:12,borderBottom:'1px solid #ddd'}}>{h}</th>)}</tr></thead><tbody>{transactions.map(t=><tr key={t.id}><td style={{padding:12}}>{new Date(t.created_at).toLocaleDateString('en-TZ')}</td><td style={{padding:12}}>{names.get(t.user_id)||'Student'}</td><td style={{padding:12}}>{t.kind}</td><td style={{padding:12}}>{money(t.amount_tzs)}</td><td style={{padding:12}}>{t.note||'—'}</td></tr>)}</tbody></table>{!transactions.length&&<p style={muted}>No demo transactions found.</p>}</div></section>
     <p style={muted}>Real payments and bank settlement reports are disabled until approved integrations are available.</p>
    </div>}
    {section==='profile'&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(290px,1fr))',gap:18}}>
     <section style={card}><h2>Institution Details</h2><dl>{([['Institution',institution.name],['Code',institution.code],['Email',institution.email],['Phone',institution.phone],['Region',institution.region],['Address',institution.address],['Website',institution.website],['Contact Person',institution.contact_person]] as [string,string|null][]).map(([key,value])=><div key={key} style={{padding:'12px 0',borderBottom:'1px solid #e8edf4'}}><dt style={muted}>{key}</dt><dd style={{margin:'5px 0 0',fontWeight:600}}>{value||'Not provided'}</dd></div>)}</dl><p style={muted}>Contact PlayGo Platform Admin to update official institution details.</p></section>
     <section style={card}><h2>Administrator Account</h2><p><strong>Username</strong><br/>{institution.admin_username||'Not provided'}</p><p><strong>Login email</strong><br/>{session.user.email}</p><p><strong>Access role</strong><br/>Institution Administrator</p><button type="button" style={action} onClick={async()=>{if(!session.user.email)return;const {error:e}=await supabase.auth.resetPasswordForEmail(session.user.email,{redirectTo:window.location.origin+'/institution/login'});setNotice(e?'Password reset failed: '+e.message:'Password reset instructions sent if the email is eligible.');}}>Request Password Reset Email</button><p style={muted}>Password reset requires a configured Supabase email service and redirect URL.</p></section>
    </div>}
   </>}
   </div>
  </div>
 </div>;
}
