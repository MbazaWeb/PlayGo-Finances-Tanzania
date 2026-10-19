import {useEffect,useState,type FormEvent} from 'react';
import {Link} from 'react-router-dom';
import type {Session,SupabaseClient} from '@supabase/supabase-js';
import './admin.css';
const TANZANIA_REGIONS=["Arusha","Dar es Salaam","Dodoma","Geita","Iringa","Kagera","Katavi","Kigoma","Kilimanjaro","Lindi","Manyara","Mara","Mbeya","Morogoro","Mtwara","Mwanza","Njombe","Pemba North","Pemba South","Pwani","Rukwa","Ruvuma","Shinyanga","Simiyu","Singida","Songwe","Tabora","Tanga","Zanzibar North","Zanzibar South and Central","Zanzibar West"] as const;
type Institute={id:string;name:string;created_at:string;code:string|null;email:string|null;phone:string|null;address:string|null;region:string|null;website:string|null;contact_person:string|null;admin_username:string|null;admin_user_id:string|null};
type Section='dashboard'|'users'|'institutions'|'reports'|'settings';
type StudentProfile={user_id:string;full_name:string};
type StudentEnrollment={user_id:string;institution_id:string;active:boolean};
export default function AdminPortal({session,supabase}:{session:Session;supabase:SupabaseClient}){
 const [section,setSection]=useState<Section>('dashboard');
 const [institutions,setInstitutions]=useState<Institute[]>([]);
 const [studentCount,setStudentCount]=useState(0);
 const [users,setUsers]=useState<StudentProfile[]>([]);
 const [userEnrollments,setUserEnrollments]=useState<StudentEnrollment[]>([]);
 const [usersSearch,setUsersSearch]=useState('');
 const [userRoles,setUserRoles]=useState<Record<string,string>>({});
 const [enrollmentCount,setEnrollmentCount]=useState(0);
 const [transactionCount,setTransactionCount]=useState(0);
 const [name,setName]=useState('');
 const [details,setDetails]=useState({code:'',email:'',phone:'',address:'',region:'',website:'',contact_person:'',admin_username:''});
 const [password,setPassword]=useState('');
 const [editing,setEditing]=useState<string|null>(null);
 const [notice,setNotice]=useState('');
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [authorized,setAuthorized]=useState(false);
 async function refresh(){
  const [inst,students,enrollments,transactions,profiles,enrollmentRows]=await Promise.all([
   supabase.from('pg_institutions').select('id,name,created_at,code,email,phone,address,region,website,contact_person,admin_username,admin_user_id').order('name'),
   supabase.from('pg_profiles').select('user_id',{count:'exact',head:true}),
   supabase.from('pg_enrollments').select('id',{count:'exact',head:true}),
   supabase.from('pg_demo_transactions').select('id',{count:'exact',head:true}),
   supabase.from('pg_profiles').select('user_id,full_name').order('full_name'),
   supabase.from('pg_enrollments').select('user_id,institution_id,active')
  ]);
  if(inst.error){setError(inst.error.message);return;}
  setInstitutions((inst.data||[]) as Institute[]);
  if(profiles.error||enrollmentRows.error){setError(profiles.error?.message||enrollmentRows.error?.message||'Unable to load users');return;}
  setUsers((profiles.data||[]) as StudentProfile[]);
  setUserEnrollments((enrollmentRows.data||[]) as StudentEnrollment[]);
  const rolesResult=await supabase.functions.invoke('pg-admin-manage-records',{body:{action:'list-roles'}});
  if(!rolesResult.error&&rolesResult.data?.roles)setUserRoles(rolesResult.data.roles as Record<string,string>);
  else {setUserRoles({});setError('Unable to verify user roles. Student list is temporarily unavailable.');}
  setStudentCount(students.count||0);setEnrollmentCount(enrollments.count||0);setTransactionCount(transactions.count||0);setError('');
 }
 useEffect(()=>{let active=true;void (async()=>{
  const {data,error:e}=await supabase.auth.getUser();
  if(!active)return;
  if(e||data.user?.app_metadata?.playgo_role!=='admin'){setAuthorized(false);setLoading(false);return;}
  setAuthorized(true);await refresh();if(active)setLoading(false);
 })();return()=>{active=false;};},[supabase,session.user.id]);
 async function save(e:FormEvent){e.preventDefault();if(!authorized)return;const clean=name.trim();if(clean.length<3||clean.length>160){setNotice('Institution name must contain 3–160 characters.');return;}
  if(details.admin_username.trim()&&password){const u=details.admin_username.trim().toLowerCase();if(!/^[a-z][a-z0-9._-]{2,39}$/.test(u)){setNotice('Invalid admin username: use 3–40 characters, start with a letter, and use letters, numbers, dots, underscores or hyphens. No spaces.');return;}if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim())){setNotice('Enter a valid Institution admin email address.');return;}if(password.length<8){setNotice('Institution admin password must be at least 8 characters.');return;}}
  setBusy(true);setNotice('');
  const payload={name:clean,code:details.code.trim()||null,email:details.email.trim()||null,phone:details.phone.trim()||null,address:details.address.trim()||null,region:details.region.trim()||null,website:details.website.trim()||null,contact_person:details.contact_person.trim()||null};
  const response=editing?await supabase.from('pg_institutions').update(payload).eq('id',editing).select('id').single():await supabase.from('pg_institutions').insert(payload).select('id').single();
  if(response.error||!response.data){setBusy(false);setNotice('Unable to save: '+(response.error?.message||'No record returned'));return;}
  const targetId=response.data.id as string;
  const selected=institutions.find(x=>x.id===editing);
  let accountNotice='';
  if(details.admin_username.trim()&&password){
   if(selected?.admin_user_id){accountNotice=' Existing institution account was preserved. Password reset requires a separate secure process.';}
   else{
    const result=await supabase.functions.invoke('pg-admin-create-institution-user',{body:{institution_id:targetId,username:details.admin_username,email:details.email,password}});
    if(result.error||result.data?.error){let reason=result.data?.error||result.error?.message||'Unknown error';if(result.error&&'context' in result.error&&result.error.context instanceof Response){try{const payload=await result.error.context.clone().json();reason=payload?.error||payload?.message||reason;}catch{reason+=' (HTTP '+result.error.context.status+')';}}setBusy(false);setEditing(targetId);setNotice('Institution saved, but admin account was not created. You can retry below. Error: '+reason);await refresh();return;}
    else accountNotice=' Institution administrator account created.';
   }
  }else if(details.admin_username.trim()&&!selected?.admin_user_id){accountNotice=' Institution saved. Enter a password to create the administrator login.';}
  setBusy(false);setName('');setPassword('');setDetails({code:'',email:'',phone:'',address:'',region:'',website:'',contact_person:'',admin_username:''});setEditing(null);setNotice((editing?'Institution updated.':'Institution created.')+accountNotice);await refresh();
 }
 async function deleteRecord(action:'delete-user'|'delete-institution',id:string,label:string){if(!window.confirm('Permanently delete '+label+'? This action cannot be undone.'))return;setBusy(true);setNotice('');const result=await supabase.functions.invoke('pg-admin-manage-records',{body:{action,id}});let reason=result.data?.error||result.error?.message||'Request failed';if(result.error&&'context' in result.error&&result.error.context instanceof Response){try{const data=await result.error.context.clone().json();reason=data.error||reason;}catch{}}setBusy(false);if(result.error||result.data?.error){setNotice('Delete failed: '+reason);return;}setNotice(label+' deleted.');await refresh();}
 function editInstitute(x:Institute){setEditing(x.id);setName(x.name);setPassword('');setDetails({code:x.code||'',email:x.email||'',phone:x.phone||'',address:x.address||'',region:x.region||'',website:x.website||'',contact_person:x.contact_person||'',admin_username:x.admin_username||''});setNotice('');}
 const nav:[Section,string,string][]=[['dashboard','▦','Dashboard'],['users','♙','Users'],['institutions','▤','Institutions'],['reports','▥','Reports'],['settings','⚙','Settings']];
 if(loading)return <main className="pga-guard">Checking administrator access…</main>;
 if(!authorized)return <main className="pga-guard"><h1>Admin access restricted</h1><p>This account does not have the PlayGo administrator role. Access must be granted by a trusted project owner, not by the browser.</p><Link to="/dashboard">Return to student portal</Link></main>;
 return <div className="pga-app">
 <aside className="pga-side"><div className="pga-brand"><span>Play<b>Go</b></span><small>ADMIN CONSOLE</small></div><p className="pga-nav-title">WORKSPACE</p><nav aria-label="Admin navigation">{nav.map(([key,symbol,label])=><button type="button" key={key} className={section===key?'active':''} onClick={()=>{setSection(key);setNotice('');}}><span>{symbol}</span>{label}</button>)}</nav><div className="pga-side-bottom"><span className="pga-dot"/> Demo finance environment <Link to="/dashboard">Student portal ↗</Link></div></aside>
 <div className="pga-main"><header className="pga-top"><div><span className="pga-crumb">PlayGo / Administration</span><h1>{section==='dashboard'?'Overview':section==='institutions'?'Institutions':section==='users'?'Users':section==='reports'?'Reports':'Settings'}</h1></div><div className="pga-user"><span className="pga-avatar">A</span><div><b>Administrator</b><small>{session.user.email||'Signed in'}</small></div></div></header>
 <div className="pga-body">{notice&&section!=='institutions'&&<p role="status" className="pga-alert">{notice}</p>}{error&&<p className="pga-alert" role="alert">{error}</p>}
 {section==='dashboard'&&<><div className="pga-heading"><div><h2>Welcome to PlayGo</h2><p>Monitor your platform's student and institution activity.</p></div><button className="pga-primary" onClick={()=>setSection('institutions')}>+ Add Institution</button></div>
 <div className="pga-stats"><article><span>Registered students</span><strong>{users.filter(u=>userRoles[u.user_id]==='student').length.toLocaleString()}</strong><small>Student profiles</small></article><article><span>Institutions</span><strong>{institutions.length.toLocaleString()}</strong><small>Available institutions</small></article><article><span>Enrollments</span><strong>{enrollmentCount.toLocaleString()}</strong><small>Recorded enrollments</small></article><article><span>Demo transactions</span><strong>{transactionCount.toLocaleString()}</strong><small>Simulated activity only</small></article></div>
 <div className="pga-card"><div className="pga-card-head"><div><h3>Institution directory</h3><p>Recently available institutions</p></div><button className="pga-link" onClick={()=>setSection('institutions')}>View all →</button></div><table><thead><tr><th>Institution</th><th>Created</th><th>Record</th></tr></thead><tbody>{institutions.slice(0,6).map(x=><tr key={x.id}><td><b>{x.name}</b></td><td>{new Date(x.created_at).toLocaleDateString()}</td><td>Active</td></tr>)}{!institutions.length&&<tr><td colSpan={3}>No institutions yet.</td></tr>}</tbody></table></div></>}
 {section==='users'&&<><div className="pga-heading"><div><h2>Users</h2><p>Registered student profiles and their recorded university enrollment.</p></div><button className="pga-secondary" onClick={()=>void refresh()}>Refresh users</button></div><div className="pga-card"><div className="pga-card-head"><div><h3>Students ({users.filter(u=>userRoles[u.user_id]==='student').length})</h3><p>University and status are based on enrollment records.</p></div><input aria-label="Search users" placeholder="Search name or university" value={usersSearch} onChange={e=>setUsersSearch(e.target.value)} className="pga-user-search"/></div><div className="pga-table-scroll"><table><thead><tr><th>Name</th><th>University</th><th>Status</th><th>Action</th></tr></thead><tbody>{users.filter(u=>userRoles[u.user_id]==='student').filter(u=>{const enrollment=userEnrollments.find(e=>e.user_id===u.user_id&&e.active)||userEnrollments.find(e=>e.user_id===u.user_id);const university=institutions.find(i=>i.id===enrollment?.institution_id)?.name||'Not assigned';return (u.full_name+' '+university).toLowerCase().includes(usersSearch.trim().toLowerCase());}).map(u=>{const enrollment=userEnrollments.find(e=>e.user_id===u.user_id&&e.active)||userEnrollments.find(e=>e.user_id===u.user_id);const university=institutions.find(i=>i.id===enrollment?.institution_id)?.name||'Not assigned';return <tr key={u.user_id}><td><b>{u.full_name||'Unnamed student'}</b></td><td>{university}</td><td><span className={'pga-user-status '+(enrollment?.active?'is-active':'')}>{enrollment?(enrollment.active?'Active':'Inactive'):'Not enrolled'}</span></td><td><button className="pga-link" disabled={busy} onClick={()=>void deleteRecord('delete-user',u.user_id,u.full_name||'student')}>Delete</button></td></tr>;})}{!users.filter(u=>userRoles[u.user_id]==='student').length&&<tr><td colSpan={4}>No student profiles found.</td></tr>}{users.some(u=>userRoles[u.user_id]==='student')&&!users.filter(u=>userRoles[u.user_id]==='student').some(u=>{const enrollment=userEnrollments.find(e=>e.user_id===u.user_id);return (u.full_name+' '+(institutions.find(i=>i.id===enrollment?.institution_id)?.name||'Not assigned')).toLowerCase().includes(usersSearch.trim().toLowerCase());})&&<tr><td colSpan={4}>No users match your search.</td></tr>}</tbody></table></div></div></>}
 {section==='institutions'&&<><div className="pga-heading"><div><h2>Manage institutions</h2><p>Create and maintain institutions available in PlayGo.</p></div></div><div className="pga-card pga-form-card"><h3>{editing?'Edit institution':'Create institution'}</h3><form onSubmit={save}><div className="pga-institution-fields"><label>Institution name *<input value={name} onChange={e=>setName(e.target.value)} required maxLength={160} placeholder="Ruaha Catholic University (RUCU)"/></label>{([['code','Institution code'],['email','Institution admin email'],['phone','Phone number'],['region','Region'],['address','Physical address'],['website','Website'],['contact_person','Contact person'],['admin_username','Admin username']] as const).map(([key,label])=><label key={key}>{label}{key==='region'?<select value={details.region} onChange={e=>setDetails(v=>({...v,region:e.target.value}))}><option value="">Select Tanzania region</option>{TANZANIA_REGIONS.map(region=><option key={region} value={region}>{region}</option>)}</select>:<input type={key==='email'?'email':key==='website'?'url':'text'} value={details[key]} onChange={e=>setDetails(v=>({...v,[key]:e.target.value}))} placeholder={label} maxLength={200}/>}</label>)}<label>Institution admin password {editing?'(new accounts only)':''}<input type="password" autoComplete="new-password" minLength={8} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimum 8 characters"/></label></div><p className="pga-hint">To create a new institution administrator login, enter admin email, username and password. Passwords are handled by Supabase Auth and are never stored in the institution table. Existing accounts are not overwritten.</p><div className="pga-form-row"><button className="pga-primary" disabled={busy}>{busy?'Saving…':editing?'Save Institution':'+ Create Institution'}</button>{editing&&<button type="button" className="pga-secondary" onClick={()=>{setEditing(null);setName('');setPassword('');setDetails({code:'',email:'',phone:'',address:'',region:'',website:'',contact_person:'',admin_username:''});}}>Cancel edit</button>}</div></form>{notice&&<p role="status">{notice}</p>}</div><div className="pga-card"><div className="pga-card-head"><h3>All institutions ({institutions.length})</h3></div><table><thead><tr><th>Institution</th><th>Date added</th><th>Action</th></tr></thead><tbody>{institutions.map(x=><tr key={x.id}><td><b>{x.name}</b></td><td>{new Date(x.created_at).toLocaleDateString()}</td><td><button className="pga-link" onClick={()=>editInstitute(x)}>Edit</button> <button className="pga-link" disabled={busy} onClick={()=>void deleteRecord('delete-institution',x.id,x.name)}>Delete</button></td></tr>)}{!institutions.length&&<tr><td colSpan={3}>Create your first institution above.</td></tr>}</tbody></table></div></>}
 {section==='reports'&&<><div className="pga-heading"><div><h2>Platform reports</h2><p>Current counts from Supabase. Demo transactions are not real money.</p></div><button className="pga-secondary" onClick={()=>void refresh()}>Refresh data</button></div><div className="pga-stats"><article><span>Students</span><strong>{users.filter(u=>userRoles[u.user_id]==='student').length}</strong></article><article><span>Institutions</span><strong>{institutions.length}</strong></article><article><span>Enrollments</span><strong>{enrollmentCount}</strong></article><article><span>Demo transactions</span><strong>{transactionCount}</strong></article></div><div className="pga-card"><h3>Reporting scope</h3><p>Counts reflect current records. Financial settlement, revenue, bank balances and verified payments are not available while integrations remain disabled.</p></div></>}
 {section==='settings'&&<><div className="pga-heading"><div><h2>Platform settings</h2><p>Read-only operational settings and access details.</p></div></div><div className="pga-card pga-settings"><div><b>Environment</b><span>Demo / Non-production financial operations</span></div><div><b>Payment integration</b><span>Disabled — NMB approval pending</span></div><div><b>Access control</b><span>Server-verified administrator role</span></div><div><b>Signed-in account</b><span>{session.user.email||session.user.id}</span></div></div></>}
 </div></div></div>;
}
