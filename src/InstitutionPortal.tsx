import {useEffect,useState,type FormEvent} from 'react';
import {Link,Navigate,useNavigate} from 'react-router-dom';
import type {Session,SupabaseClient} from '@supabase/supabase-js';
import './admin.css';

type Institution={id:string;name:string;code:string|null;email:string|null;phone:string|null;address:string|null;region:string|null;website:string|null;contact_person:string|null;admin_username:string|null};
type Section='dashboard'|'requests'|'students'|'courses'|'fees'|'payments'|'heslb'|'profile';
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

type StudentRequest={id:string;user_id:string;admission_number:string;status:'pending'|'approved'|'rejected'|'manual_verification';review_note:string|null;created_at:string;course_id:string|null};
type Course={id:string;code:string;name:string;duration_years:number|null;fee_tzs:number|null;level:string|null;study_mode:string|null};
type CourseFee={id:string;course_id:string;academic_year:string;study_year:number;amount_tzs:number};
type HeslbRecord={id:string;user_id:string;academic_year:string;amount_tzs:number;reference:string|null;disbursement_date:string|null;status:string;tuition_tzs:number;meals_accommodation_tzs:number;books_stationery_tzs:number;field_practical_tzs:number;research_tzs:number;other_tzs:number};
type EnrollmentRow={id:string;user_id:string;admission_number:string;active:boolean};
type ProfileRow={user_id:string;full_name:string};
type AcademicYear={id:string;label:string;structure:string;published:boolean};
type InstallmentRow={id:string;academic_year_id:string;installment_number:number;amount_tzs:number;due_date:string};
type DemoTransaction={id:string;user_id:string;kind:string;amount_tzs:number;created_at:string;note:string|null};
const money=(value:number)=>'TZS '+Number(value||0).toLocaleString('en-TZ');
const navItems:{id:Section;label:string;icon:string}[]=[
 {id:'dashboard',label:'Dashboard',icon:'▦'},
 {id:'requests',label:'Student Requests',icon:'✉'},
 {id:'students',label:'Students',icon:'♙'},
 {id:'courses',label:'Courses',icon:'▧'},
 {id:'fees',label:'Course Fees',icon:'▥'},
 {id:'payments',label:'Payments',icon:'▤'},
 {id:'heslb',label:'HESLB Disbursements',icon:'◎'},
 {id:'profile',label:'Institution Profile',icon:'⚙'}
];
const card:React.CSSProperties={background:'#fff',border:'1px solid #e8ecf2',borderRadius:14,padding:24,boxShadow:'0 4px 20px #15243a05'};
const action:React.CSSProperties={background:'#e32235',color:'white',border:0,borderRadius:9,padding:'12px 18px',cursor:'pointer',fontWeight:700};
const muted:React.CSSProperties={color:'#7c8795',fontSize:13};
export default function InstitutionPortal({supabase,session}:{supabase:SupabaseClient;session:Session}){
 const navigate=useNavigate();
 const [section,setSection]=useState<Section>('dashboard');
 const [institution,setInstitution]=useState<Institution|null>(null);
 const [requests,setRequests]=useState<StudentRequest[]>([]);
 const [courses,setCourses]=useState<Course[]>([]);
 const [courseFees,setCourseFees]=useState<CourseFee[]>([]);
 const [feeCourse,setFeeCourse]=useState('');const [feeYear,setFeeYear]=useState('2026/2027');const [feeStudyYear,setFeeStudyYear]=useState('1');const [feeAmount,setFeeAmount]=useState('');const [feeBusy,setFeeBusy]=useState(false);
 const [heslb,setHeslb]=useState<HeslbRecord[]>([]);
 const [heslbParts,setHeslbParts]=useState<Record<string,string>>({tuition_tzs:'',meals_accommodation_tzs:'',books_stationery_tzs:'',field_practical_tzs:'',research_tzs:'',other_tzs:''});
 const [heslbSearch,setHeslbSearch]=useState('');const [heslbStudent,setHeslbStudent]=useState('');const [heslbYear,setHeslbYear]=useState('2026/2027');const [heslbAmount,setHeslbAmount]=useState('');const [heslbReference,setHeslbReference]=useState('');const [heslbDate,setHeslbDate]=useState('');const [heslbEditing,setHeslbEditing]=useState('');const [heslbBusy,setHeslbBusy]=useState(false);
 const [courseCode,setCourseCode]=useState('');const [courseName,setCourseName]=useState('');const [courseYears,setCourseYears]=useState('3');const [courseBusy,setCourseBusy]=useState(false);
 const [reviewNotes,setReviewNotes]=useState<Record<string,string>>({});
 const [requestCourses,setRequestCourses]=useState<Record<string,string>>({});
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
  const [en,yr,req,cr,hl,cf]=await Promise.all([
   supabase.from('pg_enrollments').select('id,user_id,admission_number,active').eq('institution_id',institutionId).order('admission_number'),
   supabase.from('pg_academic_years').select('id,label,structure,published').eq('institution_id',institutionId),
   supabase.from('pg_student_requests').select('id,user_id,admission_number,status,review_note,created_at,course_id').eq('institution_id',institutionId).order('created_at',{ascending:false}),
   supabase.from('pg_courses').select('id,code,name,duration_years,fee_tzs,level,study_mode').eq('institution_id',institutionId).order('name'),
   supabase.from('pg_heslb_disbursements').select('id,user_id,academic_year,amount_tzs,reference,disbursement_date,status,tuition_tzs,meals_accommodation_tzs,books_stationery_tzs,field_practical_tzs,research_tzs,other_tzs').eq('institution_id',institutionId),
   supabase.from('pg_course_fees').select('id,course_id,academic_year,study_year,amount_tzs').eq('institution_id',institutionId)
  ]);
  if(en.error||yr.error||req.error||cr.error||hl.error||cf.error)throw new Error(en.error?.message||yr.error?.message||req.error?.message||cr.error?.message||hl.error?.message||cf.error?.message||'Data unavailable');
  setRequests((req.data||[]) as StudentRequest[]);setCourses((cr.data||[]) as Course[]);setHeslb((hl.data||[]) as HeslbRecord[]);setCourseFees((cf.data||[]) as CourseFee[]);
  const enrolled=(en.data||[]) as EnrollmentRow[];
  const academic=(yr.data||[]) as AcademicYear[];
  setEnrollments(enrolled);setYears(academic);
  const ids=[...new Set([...enrolled.map(e=>e.user_id),...(req.data||[]).map(e=>e.user_id),...(hl.data||[]).map(e=>e.user_id)])];
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
 async function reviewRequest(request:StudentRequest,status:StudentRequest['status']){
  const note=(reviewNotes[request.id]||'').trim();
  const selectedCourse=requestCourses[request.id]||request.course_id;
  if(status==='approved'&&!selectedCourse){setNotice('Select and verify the student course before approval.');return;}
  if((status==='rejected'||status==='manual_verification')&&!note){setNotice('Please provide a reason or office instructions before rejecting or requesting manual verification.');return;}
  setBusyId(request.id);setNotice('');
  const result=await supabase.from('pg_student_requests').update({status,course_id:selectedCourse||null,review_note:note||null,reviewed_at:new Date().toISOString(),reviewed_by:session.user.id}).eq('id',request.id).eq('institution_id',institutionId).select('id').single();
  if(result.error){setNotice('Review failed: '+result.error.message);setBusyId('');return;}
  if(status==='approved'){
   const existing=await supabase.from('pg_enrollments').select('id').eq('user_id',request.user_id).eq('institution_id',institutionId).maybeSingle();
   if(existing.error){setNotice('Approved, but enrollment lookup failed: '+existing.error.message);setBusyId('');return;}
   const save=existing.data?await supabase.from('pg_enrollments').update({active:true,admission_number:request.admission_number}).eq('id',existing.data.id):await supabase.from('pg_enrollments').insert({user_id:request.user_id,institution_id:institutionId,admission_number:request.admission_number,active:true});
   if(save.error){setNotice('Request approved, but enrollment creation failed: '+save.error.message);setBusyId('');return;}
  }
  try{await refresh();setNotice('Student request updated: '+status.replace('_',' ')+'.');}catch(e){setNotice('Request saved but refresh failed: '+String(e));}
  setBusyId('');
 }
 async function addCourse(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setCourseBusy(true);setNotice('');
  const {error:e}=await supabase.from('pg_courses').insert({institution_id:institutionId,code:courseCode.trim().toUpperCase(),name:courseName.trim(),duration_years:Number(courseYears)});
  if(e)setNotice('Unable to create course: '+e.message);
  else{setCourseCode('');setCourseName('');try{await refresh();setNotice('Course added.');}catch(err){setNotice(String(err));}}
  setCourseBusy(false);
 }
 async function saveCourseFee(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setFeeBusy(true);setNotice('');
  const amount=Number(feeAmount);
  if(!feeCourse||!feeYear.trim()||!Number.isSafeInteger(amount)||amount<0){setNotice('Select a course, academic year, and valid fee amount.');setFeeBusy(false);return;}
  const {error:e}=await supabase.from('pg_course_fees').upsert({institution_id:institutionId,course_id:feeCourse,academic_year:feeYear.trim(),study_year:Number(feeStudyYear),amount_tzs:amount},{onConflict:'course_id,academic_year,study_year'});
  if(e)setNotice('Unable to save course fee: '+e.message);
  else{try{await refresh();setNotice('Course fee saved.');}catch(err){setNotice(String(err));}}
  setFeeBusy(false);
 }
 async function saveHeslb(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setNotice('');
  const amount=Number(heslbAmount);
  if(!heslbStudent||!enrollments.some(e=>e.user_id===heslbStudent&&e.active)||!heslbYear.trim()||!Number.isSafeInteger(amount)||amount<0){setNotice('Select an active student and enter a valid academic year and amount.');return;}
  const breakdownKeys=['tuition_tzs','meals_accommodation_tzs','books_stationery_tzs','field_practical_tzs','research_tzs','other_tzs'] as const;
  const breakdown=Object.fromEntries(breakdownKeys.map(k=>[k,Number(heslbParts[k]||0)])) as Record<typeof breakdownKeys[number],number>;
  if(Object.values(breakdown).some(v=>!Number.isSafeInteger(v)||v<0)||Object.values(breakdown).reduce((a,b)=>a+b,0)!==amount){setNotice('The sum of loan allocations must equal the total reported amount.');return;}
  setHeslbBusy(true);
  const values={institution_id:institutionId,user_id:heslbStudent,academic_year:heslbYear.trim(),amount_tzs:amount,reference:heslbReference.trim()||null,disbursement_date:heslbDate||null,status:'reported',...breakdown};
  const result=heslbEditing?await supabase.from('pg_heslb_disbursements').update(values).eq('id',heslbEditing).eq('institution_id',institutionId).select('id').single():await supabase.from('pg_heslb_disbursements').insert(values).select('id').single();
  if(result.error)setNotice('Unable to save HESLB record: '+result.error.message);
  else{setNotice('Institution-reported HESLB record saved. Not officially verified.');setHeslbEditing('');setHeslbAmount('');setHeslbReference('');setHeslbDate('');setHeslbParts({tuition_tzs:'',meals_accommodation_tzs:'',books_stationery_tzs:'',field_practical_tzs:'',research_tzs:'',other_tzs:''});try{await refresh();}catch(e){setNotice('Saved but refresh failed: '+String(e));}}
  setHeslbBusy(false);
 }
 function editHeslb(record:HeslbRecord){setHeslbEditing(record.id);setHeslbStudent(record.user_id);setHeslbYear(record.academic_year);setHeslbAmount(String(record.amount_tzs));setHeslbReference(record.reference||'');setHeslbDate(record.disbursement_date||'');setHeslbParts(Object.fromEntries(['tuition_tzs','meals_accommodation_tzs','books_stationery_tzs','field_practical_tzs','research_tzs','other_tzs'].map(k=>[k,String(record[k as keyof HeslbRecord]||'')])));setSection('heslb');}
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
      <div className="pga-card" style={{background:'linear-gradient(120deg,#17294a,#263f6b)',color:'#fff',border:0,marginBottom:20,padding:'28px 30px'}}>
       <div style={{display:'flex',justifyContent:'space-between',gap:20,flexWrap:'wrap',alignItems:'center'}}><div><span style={{fontSize:12,letterSpacing:2,opacity:.75}}>INSTITUTION OVERVIEW</span><h2 style={{fontSize:27,margin:'10px 0 8px',color:'#fff'}}>{institution.name}</h2><p style={{opacity:.85,margin:0}}>Student verification, course fees and institution-reported loan records in one workspace.</p></div><button className="pga-primary" onClick={()=>void refresh()}>Refresh Overview ↻</button></div>
      </div>
      <div className="pga-stats" style={{marginBottom:22}}>
       <article><span>Active Students</span><strong>{activeCount}</strong><small>{enrollments.length} total enrollments</small></article>
       <article><span>Awaiting Review</span><strong>{requests.filter(r=>r.status==='pending').length}</strong><small>Admission verification requests</small></article>
       <article><span>Courses Offered</span><strong>{courses.length}</strong><small>{courseFees.length} course fee schedules</small></article>
       <article><span>HESLB Reports</span><strong>{heslb.length}</strong><small>Institution-reported, not verified</small></article>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:18,marginBottom:20}}>
       <section className="pga-card"><h3>Admissions Pipeline</h3><div style={{display:'grid',gap:12,margin:'20px 0'}}>{([['Pending',requests.filter(r=>r.status==='pending').length],['Manual verification',requests.filter(r=>r.status==='manual_verification').length],['Rejected',requests.filter(r=>r.status==='rejected').length],['Approved',requests.filter(r=>r.status==='approved').length]] as [string,number][]).map(([label,value])=><div key={label} style={{display:'flex',justifyContent:'space-between',borderBottom:'1px solid #edf0f5',paddingBottom:10}}><span>{label}</span><strong>{value}</strong></div>)}</div><button className="pga-primary" onClick={()=>setSection('requests')}>Review Requests →</button></section>
       <section className="pga-card"><h3>Reported Loan Allocation</h3><p style={muted}>Figures are entered by the institution, not sourced from HESLB.</p><strong style={{fontSize:27}}>{money(heslb.reduce((sum,h)=>sum+Number(h.amount_tzs),0))}</strong><div style={{display:'grid',gap:10,margin:'18px 0'}}>{([['Tuition',heslb.reduce((n,h)=>n+Number(h.tuition_tzs||0),0)],['Meals & Accommodation',heslb.reduce((n,h)=>n+Number(h.meals_accommodation_tzs||0),0)],['Other allocations',heslb.reduce((n,h)=>n+Number(h.books_stationery_tzs||0)+Number(h.field_practical_tzs||0)+Number(h.research_tzs||0)+Number(h.other_tzs||0),0)]] as [string,number][]).map(([label,value])=><div key={label} style={{display:'flex',justifyContent:'space-between',gap:10}}><span>{label}</span><strong>{money(value)}</strong></div>)}</div><button className="pga-primary" onClick={()=>setSection('heslb')}>Manage Loan Records →</button></section>
      </div>
      <div className="pga-card"><h3>Quick Actions</h3><div style={{display:'flex',gap:10,flexWrap:'wrap'}}><button className="pga-secondary" onClick={()=>setSection('students')}>Registered Students</button><button className="pga-secondary" onClick={()=>setSection('courses')}>Courses</button><button className="pga-secondary" onClick={()=>setSection('fees')}>Course Fee Schedules</button><button className="pga-secondary" onClick={()=>setSection('payments')}>Payments</button></div></div>
    </>}
    {section==='requests'&&<><div className="pga-heading"><div><h2>Student Admission Requests</h2><p>Review student applications for {institution.name}. Verify official admission records before approval.</p></div><button className="pga-secondary" onClick={()=>void refresh()}>Refresh</button></div><div className="pga-card"><div className="pga-table-scroll"><table><thead><tr><th>Student</th><th>Admission number</th><th>Course</th><th>Status</th><th>Review / Office Instructions</th></tr></thead><tbody>{requests.filter(r=>r.status!=='approved').map(r=><tr key={r.id}><td><b>{names.get(r.user_id)||'Student'}</b><br/><small>{new Date(r.created_at).toLocaleDateString()}</small></td><td>{r.admission_number}</td><td><select aria-label={'Course for '+r.admission_number} value={requestCourses[r.id]??r.course_id??''} onChange={e=>setRequestCourses(v=>({...v,[r.id]:e.target.value}))}><option value="">Select course</option>{courses.map(c=><option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}</select></td><td><span className={'pga-user-status '+(r.status==='approved'?'is-active':'')}>{r.status.replace('_',' ')}</span></td><td><textarea aria-label={'Review note for '+r.admission_number} value={reviewNotes[r.id]??r.review_note??''} onChange={e=>setReviewNotes(v=>({...v,[r.id]:e.target.value}))} rows={2} placeholder="Reason or office instructions" style={{width:'100%',minWidth:210,border:'1px solid #d7dfea',borderRadius:8,padding:8}}/><div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:8}}><button className="pga-primary" disabled={busyId===r.id} onClick={()=>void reviewRequest(r,'approved')}>Approve</button><button className="pga-secondary" disabled={busyId===r.id} onClick={()=>void reviewRequest(r,'rejected')}>Reject</button><button className="pga-secondary" disabled={busyId===r.id} onClick={()=>void reviewRequest(r,'manual_verification')}>Visit Admin Office</button></div></td></tr>)}{!requests.some(r=>r.status!=='approved')&&<tr><td colSpan={5}>No pending or unresolved student requests.</td></tr>}</tbody></table></div></div></>}
    {section==='courses'&&<><div className="pga-heading"><div><h2>Courses & Programmes</h2><p>Maintain courses offered by your institution.</p></div></div><div className="pga-card pga-form-card"><h3>Add Course</h3><form onSubmit={addCourse}><div className="pga-institution-fields"><label>Course Code<input required maxLength={30} value={courseCode} onChange={e=>setCourseCode(e.target.value)} placeholder="BBA"/></label><label>Course Name<input required maxLength={160} value={courseName} onChange={e=>setCourseName(e.target.value)} placeholder="Bachelor of Business Administration"/></label><label>Duration (years)<input required type="number" min={1} max={10} value={courseYears} onChange={e=>setCourseYears(e.target.value)}/></label></div><button className="pga-primary" disabled={courseBusy}>+ Add Course</button></form></div><div className="pga-card"><h3>Courses ({courses.length})</h3><table><thead><tr><th>Code</th><th>Course</th><th>Duration</th><th>Level</th><th>Listed Fee (TZS)</th></tr></thead><tbody>{courses.map(c=><tr key={c.id}><td>{c.code}</td><td><b>{c.name}</b></td><td>{c.duration_years?c.duration_years+' years':'Not published'}</td><td>{c.level||'—'}</td><td>{c.fee_tzs!=null?money(c.fee_tzs):'Not published'}</td></tr>)}{!courses.length&&<tr><td colSpan={5}>No courses configured.</td></tr>}</tbody></table></div></>}
    {section==='fees'&&<><div className="pga-card pga-form-card"><h3>Add / Update Course Fee</h3><p>Set the fee for a specific course, academic year and year of study. The programme-level catalogue amounts are references only.</p><form onSubmit={saveCourseFee}><div className="pga-institution-fields"><label>Course<select required value={feeCourse} onChange={e=>setFeeCourse(e.target.value)}><option value="">Select course</option>{courses.map(c=><option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}</select></label><label>Academic Year<input required value={feeYear} onChange={e=>setFeeYear(e.target.value)}/></label><label>Study Year<input required type="number" min="1" max="10" value={feeStudyYear} onChange={e=>setFeeStudyYear(e.target.value)}/></label><label>Amount (TZS)<input required type="number" min="0" step="1" value={feeAmount} onChange={e=>setFeeAmount(e.target.value)}/></label></div><button className="pga-primary" disabled={feeBusy}>Save Course Fee</button></form></div><div className="pga-card"><h3>Course Fee Schedule ({courseFees.length})</h3><table><thead><tr><th>Course</th><th>Academic Year</th><th>Study Year</th><th>Amount</th></tr></thead><tbody>{courseFees.map(f=><tr key={f.id}><td>{courses.find(c=>c.id===f.course_id)?.name||'Course'}</td><td>{f.academic_year}</td><td>{f.study_year}</td><td>{money(f.amount_tzs)}</td></tr>)}{!courseFees.length&&<tr><td colSpan={4}>No course-specific fee schedules configured.</td></tr>}</tbody></table></div><div className="pga-heading"><div><h2>Course Fees</h2><p>Academic-year installment schedules are separate from programme catalogue fees and per-study-year course fees.</p></div></div><div className="pga-stats"><article><span>Academic years</span><strong>{years.length}</strong></article><article><span>Fee installments</span><strong>{installments.length}</strong></article><article><span>Scheduled amount</span><strong style={{fontSize:22}}>{money(totalFees)}</strong></article></div><div className="pga-card"><table><thead><tr><th>Year</th><th>Installment</th><th>Amount</th><th>Due date</th></tr></thead><tbody>{installments.map(i=><tr key={i.id}><td>{years.find(y=>y.id===i.academic_year_id)?.label||'—'}</td><td>{i.installment_number}</td><td>{money(i.amount_tzs)}</td><td>{i.due_date}</td></tr>)}{!installments.length&&<tr><td colSpan={4}>No fee schedules yet.</td></tr>}</tbody></table></div></>}
    {section==='heslb'&&<><div className="pga-heading"><div><h2>HESLB Loan Disbursements</h2><p>Search students and maintain institution-reported loan records. This is not an official HESLB integration or payment confirmation.</p></div></div><div className="pga-stats"><article><span>Institution-reported records</span><strong>{heslb.length}</strong></article><article><span>Total reported amount</span><strong style={{fontSize:22}}>{money(heslb.reduce((sum,r)=>sum+Number(r.amount_tzs),0))}</strong></article></div><div className="pga-card"><h3>{heslbEditing?'Update Student Loan Record':'Add Student Loan Record'}</h3><form onSubmit={saveHeslb}><div className="pga-institution-fields"><label>Student<select required value={heslbStudent} onChange={e=>setHeslbStudent(e.target.value)}><option value="">Select approved student</option>{enrollments.filter(e=>e.active).map(e=><option key={e.id} value={e.user_id}>{names.get(e.user_id)||'Student'} — {e.admission_number}</option>)}</select></label><label>Academic year<input required value={heslbYear} onChange={e=>setHeslbYear(e.target.value)}/></label><label>Reported amount (TZS)<input required type="number" min="0" step="1" value={heslbAmount} onChange={e=>setHeslbAmount(e.target.value)}/></label>{([['tuition_tzs','Tuition / Fee'],['meals_accommodation_tzs','Meals & Accommodation'],['books_stationery_tzs','Books & Stationery'],['field_practical_tzs','Field / Practical Training'],['research_tzs','Research'],['other_tzs','Other Approved Components']] as [string,string][]).map(([key,label])=><label key={key}>{label} (TZS)<input type="number" min="0" step="1" value={heslbParts[key]||''} onChange={e=>setHeslbParts(p=>({...p,[key]:e.target.value}))}/></label>)}<div style={{padding:12,background:'#f3f6fa',borderRadius:8}}><strong>Allocation total: {money(Object.values(heslbParts).reduce((n,v)=>n+Number(v||0),0))}</strong><p style={muted}>Must equal reported amount: {money(Number(heslbAmount||0))}</p></div><label>Reference (optional)<input value={heslbReference} onChange={e=>setHeslbReference(e.target.value)}/></label><label>Reported disbursement date<input type="date" value={heslbDate} onChange={e=>setHeslbDate(e.target.value)}/></label></div><button className="pga-primary" disabled={heslbBusy}>{heslbBusy?'Saving…':heslbEditing?'Update Record':'Add Record'}</button>{heslbEditing&&<button type="button" className="pga-secondary" onClick={()=>{setHeslbEditing('');setHeslbStudent('');setHeslbAmount('');setHeslbReference('');setHeslbDate('');}}>Cancel edit</button>}</form><p style={muted}>Records entered here are labelled institution-reported, never HESLB-verified. No wallet funds are credited.</p></div><div className="pga-card"><h3>Student Loan Records</h3><input aria-label="Search HESLB records" placeholder="Search student name, admission number or reference" value={heslbSearch} onChange={e=>setHeslbSearch(e.target.value)} style={{width:'100%',maxWidth:520,padding:12,border:'1px solid #d7deeb',borderRadius:8,marginBottom:16}}/><table><thead><tr><th>Student</th><th>Academic year</th><th>Amount</th><th>Tuition</th><th>Meals & Accommodation</th><th>Other</th><th>Reference</th><th>Status</th><th>Action</th></tr></thead><tbody>{heslb.filter(h=>{const e=enrollments.find(e=>e.user_id===h.user_id);return (names.get(h.user_id)+' '+(e?.admission_number||'')+' '+(h.reference||'')).toLowerCase().includes(heslbSearch.toLowerCase());}).map(h=><tr key={h.id}><td>{names.get(h.user_id)||'Student'}<small style={{display:'block'}}>{enrollments.find(e=>e.user_id===h.user_id)?.admission_number||''}</small></td><td>{h.academic_year}</td><td>{money(h.amount_tzs)}</td><td>{money(h.tuition_tzs||0)}</td><td>{money(h.meals_accommodation_tzs||0)}</td><td>{money((h.books_stationery_tzs||0)+(h.field_practical_tzs||0)+(h.research_tzs||0)+(h.other_tzs||0))}</td><td>{h.reference||'—'}</td><td>{h.status==='verified'?'Externally verified':'Institution reported / unverified'}</td><td><button className="pga-secondary" disabled={h.status==='verified'} onClick={()=>editHeslb(h)}>Edit</button></td></tr>)}{!heslb.length&&<tr><td colSpan={9}>No loan records yet. This does not indicate whether HESLB has paid a student.</td></tr>}</tbody></table></div></>}
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
