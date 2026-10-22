import {SupportInbox} from './Services';
import {useEffect,useState,type FormEvent} from 'react';
import {Link,Navigate,useNavigate} from 'react-router-dom';
import type {Session,SupabaseClient} from '@supabase/supabase-js';
import './admin.css';
import { InstitutionIdentityReviews } from './InstitutionIdentityReviews';

type Institution={id:string;name:string;code:string|null;email:string|null;phone:string|null;address:string|null;region:string|null;website:string|null;contact_person:string|null;admin_username:string|null};
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
  {error&&<p className="pg-error" role="alert">{error}</p>}</form>
 </section></main>;
}


type Section='dashboard'|'requests'|'students'|'inquiries'|'profile';

type StudentRequest={id:string;user_id:string;admission_number:string;status:'pending'|'approved'|'rejected'|'manual_verification';review_note:string|null;created_at:string;course_id:string|null};
type Course={id:string;code:string;name:string};
type Enrollment={id:string;user_id:string;admission_number:string;active:boolean};
type Profile={user_id:string;full_name:string};
const navItems:{id:Section;label:string;icon:string}[]=[
 {id:'dashboard',label:'Dashboard',icon:'▦'},
 {id:'requests',label:'Student Requests',icon:'✉'},
 {id:'students',label:'Students',icon:'♙'},
 {id:'inquiries',label:'Inquiries',icon:'✉'},
 {id:'profile',label:'Institution Profile',icon:'⚙'}
];
const card:React.CSSProperties={background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:24,boxShadow:'0 4px 20px #15243a05'};
const muted:React.CSSProperties={color:'#7c8795',fontSize:13};
export default function InstitutionPortal({supabase,session}:{supabase:SupabaseClient;session:Session}){
 const navigate=useNavigate();
 const [section,setSection]=useState<Section>('dashboard');
 const [institution,setInstitution]=useState<Institution|null>(null);
 const [requests,setRequests]=useState<StudentRequest[]>([]);
 const [courses,setCourses]=useState<Course[]>([]);
 const [enrollments,setEnrollments]=useState<Enrollment[]>([]);
 const [profiles,setProfiles]=useState<Profile[]>([]);
 const [reviewNotes,setReviewNotes]=useState<Record<string,string>>({});
 const [requestCourses,setRequestCourses]=useState<Record<string,string>>({});
 const [search,setSearch]=useState('');
 const [filter,setFilter]=useState('all');
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [loading,setLoading]=useState(true);
 const [busyId,setBusyId]=useState('');
 const institutionId=String(session.user.app_metadata?.institution_id||'');
 const allowed=isInstitutionAdmin(session);
 async function refresh(){
  const inst=await supabase.from('pg_institutions').select('id,name,code,email,phone,address,region,website,contact_person,admin_username').eq('id',institutionId).eq('admin_user_id',session.user.id).maybeSingle();
  if(inst.error)throw new Error(inst.error.message);
  if(!inst.data)throw new Error('This account is not linked to an institution.');
  const [en,req,cr]=await Promise.all([
   supabase.from('pg_enrollments').select('id,user_id,admission_number,active').eq('institution_id',institutionId).order('admission_number'),
   supabase.from('pg_student_requests').select('id,user_id,admission_number,status,review_note,created_at,course_id').eq('institution_id',institutionId).order('created_at',{ascending:false}),
   supabase.from('pg_courses').select('id,code,name').eq('institution_id',institutionId).order('name')
  ]);
  if(en.error||req.error||cr.error)throw new Error(en.error?.message||req.error?.message||cr.error?.message||'Unable to load institution records.');
  const enrolled=(en.data||[]) as Enrollment[];
  const applications=(req.data||[]) as StudentRequest[];
  const ids=[...new Set([...enrolled.map(e=>e.user_id),...applications.map(e=>e.user_id)])];
  const profileResult=ids.length?await supabase.from('pg_profiles').select('user_id,full_name').in('user_id',ids):{data:[],error:null};
  if(profileResult.error)throw new Error(profileResult.error.message);
  setInstitution(inst.data as Institution);
  setEnrollments(enrolled);setRequests(applications);setCourses((cr.data||[]) as Course[]);setProfiles((profileResult.data||[]) as Profile[]);
 }
 useEffect(()=>{if(!allowed)return;let active=true;void refresh().catch(e=>{if(active)setError(e instanceof Error?e.message:'Unable to load institution data');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false};},[supabase,institutionId,session.user.id,allowed]);
 if(!allowed)return <Navigate to="/institution/login" replace/>;
 const names=new Map(profiles.map(p=>[p.user_id,p.full_name]));
 const pending=requests.filter(r=>r.status==='pending'||r.status==='manual_verification');
 const approved=requests.filter(r=>r.status==='approved').length;
 const active=enrollments.filter(e=>e.active).length;
 const visible=enrollments.filter(e=>((names.get(e.user_id)||'')+' '+e.admission_number).toLowerCase().includes(search.toLowerCase().trim())&&(filter==='all'||(filter==='active'?e.active:!e.active)));
 async function logout(){await supabase.auth.signOut();navigate('/institution/login',{replace:true});}
 async function reviewRequest(request:StudentRequest,status:StudentRequest['status']){
  const note=(reviewNotes[request.id]??request.review_note??'').trim();
  const course=requestCourses[request.id]||request.course_id;
  if(status==='approved'&&!course){setNotice('Select the admitted student course before approval.');return;}
  if(status!=='approved'&&!note){setNotice('Enter a reason or office instructions.');return;}
  setBusyId(request.id);setNotice('');
  try{
   const update=await supabase.from('pg_student_requests').update({status,course_id:course||null,review_note:note||null,reviewed_at:new Date().toISOString(),reviewed_by:session.user.id}).eq('id',request.id).eq('institution_id',institutionId).select('id').single();
   if(update.error)throw new Error(update.error.message);
   if(status==='approved'){
    const existing=await supabase.from('pg_enrollments').select('id').eq('user_id',request.user_id).eq('institution_id',institutionId).maybeSingle();
    if(existing.error)throw new Error('Request approved, enrollment lookup failed: '+existing.error.message);
    const saved=existing.data?await supabase.from('pg_enrollments').update({active:true,admission_number:request.admission_number}).eq('id',existing.data.id).eq('institution_id',institutionId):await supabase.from('pg_enrollments').insert({user_id:request.user_id,institution_id:institutionId,admission_number:request.admission_number,active:true});
    if(saved.error)throw new Error('Request approved, enrollment sync failed: '+saved.error.message);
   }
   await refresh();setNotice('Student request updated.');
  }catch(e){setNotice(e instanceof Error?e.message:'Unable to update student request.');}finally{setBusyId('');}
 }
 async function changeStatus(enrollment:Enrollment){
  setBusyId(enrollment.id);setNotice('');
  const result=await supabase.from('pg_enrollments').update({active:!enrollment.active}).eq('id',enrollment.id).eq('institution_id',institutionId).select('id,active').single();
  if(result.error||!result.data)setNotice('Update failed: '+(result.error?.message||'No enrollment updated'));
  else{setEnrollments(old=>old.map(e=>e.id===enrollment.id?{...e,active:result.data.active}:e));setNotice('Student verification status updated.');}
  setBusyId('');
 }
 const heading=navItems.find(item=>item.id===section)?.label||'Dashboard';
 return <div className="pga-app">
  <aside className="pga-side">
   <div className="pga-brand"><span>Play<b>Go</b></span><small>INSTITUTION PORTAL</small></div>
   <p className="pga-nav-title">WORKSPACE</p>
   <nav aria-label="Institution navigation">{navItems.map(item=><button key={item.id} type="button" className={section===item.id?'active':''} onClick={()=>{setSection(item.id);setNotice('');}}><span aria-hidden="true">{item.icon}</span>{item.label}</button>)}</nav>
   <div className="pga-side-bottom"><span className="pga-dot"/> Demo Portal <button type="button" className="pga-institution-signout" onClick={()=>void logout()}>Sign out ↗</button></div>
  </aside>
  <div className="pga-main">
   <header className="pga-top"><div><span className="pga-crumb">PlayGo / Institution / {heading}</span><h1>{heading}</h1></div><div className="pga-user"><span className="pga-avatar">{(institution?.name||'I').charAt(0)}</span><div><b>{institution?.name||'Institution Administrator'}</b><small>{session.user.email}</small></div></div></header>
   <div className="pga-body">
    {loading?<section style={card}>Loading institution data…</section>:error?<section style={card} role="alert">{error}<p><button className="pga-secondary" onClick={()=>{setError('');setLoading(true);void refresh().catch(e=>setError(String(e))).finally(()=>setLoading(false));}}>Retry</button></p></section>:institution&&<>
     {notice&&<p role="status" style={{...card,borderColor:'#bbd7f2'}}>{notice}</p>}
     {section==='dashboard'&&<div className="pga-advanced-dashboard">
      <div className="pga-dash-header"><div><span className="pga-dash-kicker">STUDENT VERIFICATION</span><h2>{institution.name}</h2><p>Admissions and student support overview</p></div><button className="pga-secondary" onClick={()=>void refresh()}>↻ Refresh</button></div>
      <div className="pga-dash-kpis">
       <article><span>Verified Students</span><strong>{active}</strong><small>Active enrollments</small></article>
       <article><span>Pending Requests</span><strong>{pending.length}</strong><small>Require institution review</small></article>
       <article><span>Approved Requests</span><strong>{approved}</strong><small>Verified admissions</small></article>
       <article><span>Total Applications</span><strong>{requests.length}</strong><small>Submitted student requests</small></article>
      </div>
      <div className="pga-dash-visuals">
       <section className="pga-card pga-dash-admissions"><div className="pga-dash-section-head"><div><h3>Admission Status</h3><p>Student request breakdown</p></div></div>
        {([{label:'Approved',value:approved,color:'#159a6c'},{label:'Pending Review',value:pending.length,color:'#edaa3e'},{label:'Rejected',value:requests.filter(r=>r.status==='rejected').length,color:'#e32235'}]).map(x=><div key={x.label} className="pga-admission-progress"><div><span>{x.label}</span><strong>{x.value}</strong></div><div className="pga-admission-track"><i style={{width:(requests.length?x.value/requests.length*100:0)+'%',background:x.color}}/></div></div>)}
       </section>
       <section className="pga-card pga-dash-admissions"><div className="pga-dash-section-head"><div><h3>Quick Access</h3><p>Manage institution verification</p></div></div><button className="pga-secondary" onClick={()=>setSection('requests')}>Review Student Requests →</button><button className="pga-secondary" onClick={()=>setSection('students')}>View Verified Students →</button><button className="pga-secondary" onClick={()=>setSection('inquiries')}>Open Inquiries →</button></section>
      </div>
      <section className="pga-card pga-dash-recent"><div className="pga-dash-section-head"><div><h3>Recent Admission Requests</h3><p>Latest student verification submissions</p></div><button className="pga-secondary" onClick={()=>setSection('requests')}>View all →</button></div><div className="pga-table-scroll"><table><thead><tr><th>Student</th><th>Admission Number</th><th>Status</th><th>Date</th></tr></thead><tbody>{requests.slice(0,6).map(r=><tr key={r.id}><td>{names.get(r.user_id)||'Student'}</td><td>{r.admission_number}</td><td>{r.status.replace('_',' ')}</td><td>{new Date(r.created_at).toLocaleDateString('en-GB')}</td></tr>)}{!requests.length&&<tr><td colSpan={4}>No student requests yet.</td></tr>}</tbody></table></div></section>
     </div>}
     {section==='requests'&&<><div className="pga-heading"><div><h2>Student Admission Requests</h2><p>Verify student admission and course before approval.</p></div><button className="pga-secondary" onClick={()=>void refresh()}>Refresh</button></div><section className="pga-card"><div className="pga-table-scroll"><table><thead><tr><th>Student</th><th>Admission Number</th><th>Course</th><th>Status</th><th>Actions</th></tr></thead><tbody>{requests.filter(r=>r.status!=='approved').map(r=><tr key={r.id}><td><strong>{names.get(r.user_id)||'Student'}</strong></td><td>{r.admission_number}</td><td><select aria-label={'Course for '+r.admission_number} value={requestCourses[r.id]??r.course_id??''} onChange={e=>setRequestCourses(v=>({...v,[r.id]:e.target.value}))}><option value="">Select course</option>{courses.map(c=><option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}</select></td><td>{r.status.replace('_',' ')}</td><td><textarea aria-label={'Review note for '+r.admission_number} value={reviewNotes[r.id]??r.review_note??''} onChange={e=>setReviewNotes(v=>({...v,[r.id]:e.target.value}))} rows={2} placeholder="Office instructions"/><div className="pga-review-actions"><button className="pga-primary" disabled={busyId===r.id} onClick={()=>void reviewRequest(r,'approved')}>Approve</button><button className="pga-secondary" disabled={busyId===r.id} onClick={()=>void reviewRequest(r,'rejected')}>Reject</button><button className="pga-secondary" disabled={busyId===r.id} onClick={()=>void reviewRequest(r,'manual_verification')}>Office Review</button></div></td></tr>)}{!requests.some(r=>r.status!=='approved')&&<tr><td colSpan={5}>No pending student requests.</td></tr>}</tbody></table></div></section></>}
     {section==='requests'&&<InstitutionIdentityReviews supabase={supabase}/>}
     {section==='students'&&<section className="pga-card"><div className="pga-dash-section-head"><div><h2>Verified Students</h2><p>Students linked to {institution.name}</p></div><strong>{visible.length} records</strong></div><div className="pga-student-filters"><input aria-label="Search students" placeholder="Search name or admission number" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Filter verification" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div><div className="pga-table-scroll"><table><thead><tr><th>Student</th><th>Admission Number</th><th>Status</th><th>Action</th></tr></thead><tbody>{visible.map(e=><tr key={e.id}><td>{names.get(e.user_id)||'Student'}</td><td>{e.admission_number}</td><td>{e.active?'Active':'Inactive'}</td><td><button className="pga-secondary" disabled={busyId===e.id} onClick={()=>void changeStatus(e)}>{busyId===e.id?'Saving…':e.active?'Deactivate':'Activate'}</button></td></tr>)}{!visible.length&&<tr><td colSpan={4}>No matching students.</td></tr>}</tbody></table></div></section>}
     {section==='inquiries'&&<SupportInbox supabase={supabase} userId={session.user.id} role="institution" institutionId={institutionId}/>}
     {section==='profile'&&<div className="pga-profile-grid"><section className="pga-card"><h2>Institution Details</h2><dl>{([['Institution',institution.name],['Code',institution.code],['Email',institution.email],['Phone',institution.phone],['Region',institution.region],['Address',institution.address],['Website',institution.website],['Contact Person',institution.contact_person]] as [string,string|null][]).map(([key,value])=><div key={key} className="pga-profile-detail"><dt>{key}</dt><dd>{value||'Not provided'}</dd></div>)}</dl></section><section className="pga-card"><h2>Administrator Account</h2><p><strong>Username</strong><br/>{institution.admin_username||'Not provided'}</p><p><strong>Login email</strong><br/>{session.user.email}</p><p><strong>Access role</strong><br/>Institution Administrator</p><button className="pga-secondary" onClick={async()=>{if(!session.user.email)return;const result=await supabase.auth.resetPasswordForEmail(session.user.email,{redirectTo:window.location.origin+'/institution/login'});setNotice(result.error?'Password reset failed: '+result.error.message:'Password reset email requested.');}}>Reset Password</button></section></div>}
    </>}
   </div>
  </div>
 </div>;
}
