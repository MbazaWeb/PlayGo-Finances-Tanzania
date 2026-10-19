import {useEffect,useState,type FormEvent} from 'react';
import {Link} from 'react-router-dom';
import type {Session,SupabaseClient} from '@supabase/supabase-js';
import './admin.css';
type Institute={id:string;name:string;created_at:string};
type Section='dashboard'|'institutions'|'reports'|'settings';
export default function AdminPortal({session,supabase}:{session:Session;supabase:SupabaseClient}){
 const [section,setSection]=useState<Section>('dashboard');
 const [institutions,setInstitutions]=useState<Institute[]>([]);
 const [studentCount,setStudentCount]=useState(0);
 const [enrollmentCount,setEnrollmentCount]=useState(0);
 const [transactionCount,setTransactionCount]=useState(0);
 const [name,setName]=useState('');
 const [editing,setEditing]=useState<string|null>(null);
 const [notice,setNotice]=useState('');
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [authorized,setAuthorized]=useState(false);
 async function refresh(){
  const [inst,students,enrollments,transactions]=await Promise.all([
   supabase.from('pg_institutions').select('id,name,created_at').order('name'),
   supabase.from('pg_profiles').select('user_id',{count:'exact',head:true}),
   supabase.from('pg_enrollments').select('id',{count:'exact',head:true}),
   supabase.from('pg_demo_transactions').select('id',{count:'exact',head:true})
  ]);
  if(inst.error){setError(inst.error.message);return;}
  setInstitutions((inst.data||[]) as Institute[]);
  setStudentCount(students.count||0);setEnrollmentCount(enrollments.count||0);setTransactionCount(transactions.count||0);setError('');
 }
 useEffect(()=>{let active=true;void (async()=>{
  const {data,error:e}=await supabase.auth.getUser();
  if(!active)return;
  if(e||data.user?.app_metadata?.playgo_role!=='admin'){setAuthorized(false);setLoading(false);return;}
  setAuthorized(true);await refresh();if(active)setLoading(false);
 })();return()=>{active=false;};},[supabase,session.user.id]);
 async function save(e:FormEvent){e.preventDefault();if(!authorized)return;const clean=name.trim();if(clean.length<3||clean.length>160){setNotice('Institution name must contain 3–160 characters.');return;}
  setBusy(true);setNotice('');
  const response=editing?await supabase.from('pg_institutions').update({name:clean}).eq('id',editing):await supabase.from('pg_institutions').insert({name:clean});
  setBusy(false);
  if(response.error){setNotice('Unable to save: '+response.error.message);return;}
  setName('');setEditing(null);setNotice(editing?'Institution updated.':'Institution created.');await refresh();
 }
 const nav:[Section,string,string][]=[['dashboard','▦','Dashboard'],['institutions','▤','Institutions'],['reports','▥','Reports'],['settings','⚙','Settings']];
 if(loading)return <main className="pga-guard">Checking administrator access…</main>;
 if(!authorized)return <main className="pga-guard"><h1>Admin access restricted</h1><p>This account does not have the PlayGo administrator role. Access must be granted by a trusted project owner, not by the browser.</p><Link to="/dashboard">Return to student portal</Link></main>;
 return <div className="pga-app">
 <aside className="pga-side"><div className="pga-brand"><span>Play<b>Go</b></span><small>ADMIN CONSOLE</small></div><p className="pga-nav-title">WORKSPACE</p><nav aria-label="Admin navigation">{nav.map(([key,symbol,label])=><button type="button" key={key} className={section===key?'active':''} onClick={()=>{setSection(key);setNotice('');}}><span>{symbol}</span>{label}</button>)}</nav><div className="pga-side-bottom"><span className="pga-dot"/> Demo finance environment <Link to="/dashboard">Student portal ↗</Link></div></aside>
 <div className="pga-main"><header className="pga-top"><div><span className="pga-crumb">PlayGo / Administration</span><h1>{section==='dashboard'?'Overview':section==='institutions'?'Institutions':section==='reports'?'Reports':'Settings'}</h1></div><div className="pga-user"><span className="pga-avatar">A</span><div><b>Administrator</b><small>{session.user.email||'Signed in'}</small></div></div></header>
 <div className="pga-body">{error&&<p className="pga-alert" role="alert">{error}</p>}
 {section==='dashboard'&&<><div className="pga-heading"><div><h2>Welcome to PlayGo</h2><p>Monitor your platform's student and institution activity.</p></div><button className="pga-primary" onClick={()=>setSection('institutions')}>+ Add Institution</button></div>
 <div className="pga-stats"><article><span>Registered students</span><strong>{studentCount.toLocaleString()}</strong><small>Student profiles</small></article><article><span>Institutions</span><strong>{institutions.length.toLocaleString()}</strong><small>Available institutions</small></article><article><span>Enrollments</span><strong>{enrollmentCount.toLocaleString()}</strong><small>Recorded enrollments</small></article><article><span>Demo transactions</span><strong>{transactionCount.toLocaleString()}</strong><small>Simulated activity only</small></article></div>
 <div className="pga-card"><div className="pga-card-head"><div><h3>Institution directory</h3><p>Recently available institutions</p></div><button className="pga-link" onClick={()=>setSection('institutions')}>View all →</button></div><table><thead><tr><th>Institution</th><th>Created</th><th>Record</th></tr></thead><tbody>{institutions.slice(0,6).map(x=><tr key={x.id}><td><b>{x.name}</b></td><td>{new Date(x.created_at).toLocaleDateString()}</td><td>Active</td></tr>)}{!institutions.length&&<tr><td colSpan={3}>No institutions yet.</td></tr>}</tbody></table></div></>}
 {section==='institutions'&&<><div className="pga-heading"><div><h2>Manage institutions</h2><p>Create and maintain institutions available in PlayGo.</p></div></div><div className="pga-card pga-form-card"><h3>{editing?'Edit institution':'Create institution'}</h3><form onSubmit={save}><label htmlFor="pga-institution">Institution name</label><div className="pga-form-row"><input id="pga-institution" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Ruaha Catholic University (RUCU)" maxLength={160} required/><button className="pga-primary" disabled={busy}>{busy?'Saving…':editing?'Save Changes':'+ Add Institution'}</button>{editing&&<button type="button" className="pga-secondary" onClick={()=>{setEditing(null);setName('');}}>Cancel</button>}</div></form>{notice&&<p role="status">{notice}</p>}</div><div className="pga-card"><div className="pga-card-head"><h3>All institutions ({institutions.length})</h3></div><table><thead><tr><th>Institution</th><th>Date added</th><th>Action</th></tr></thead><tbody>{institutions.map(x=><tr key={x.id}><td><b>{x.name}</b></td><td>{new Date(x.created_at).toLocaleDateString()}</td><td><button className="pga-link" onClick={()=>{setEditing(x.id);setName(x.name);}}>Edit</button></td></tr>)}{!institutions.length&&<tr><td colSpan={3}>Create your first institution above.</td></tr>}</tbody></table></div></>}
 {section==='reports'&&<><div className="pga-heading"><div><h2>Platform reports</h2><p>Current counts from Supabase. Demo transactions are not real money.</p></div><button className="pga-secondary" onClick={()=>void refresh()}>Refresh data</button></div><div className="pga-stats"><article><span>Students</span><strong>{studentCount}</strong></article><article><span>Institutions</span><strong>{institutions.length}</strong></article><article><span>Enrollments</span><strong>{enrollmentCount}</strong></article><article><span>Demo transactions</span><strong>{transactionCount}</strong></article></div><div className="pga-card"><h3>Reporting scope</h3><p>Counts reflect current records. Financial settlement, revenue, bank balances and verified payments are not available while integrations remain disabled.</p></div></>}
 {section==='settings'&&<><div className="pga-heading"><div><h2>Platform settings</h2><p>Read-only operational settings and access details.</p></div></div><div className="pga-card pga-settings"><div><b>Environment</b><span>Demo / Non-production financial operations</span></div><div><b>Payment integration</b><span>Disabled — NMB approval pending</span></div><div><b>Access control</b><span>Server-verified administrator role</span></div><div><b>Signed-in account</b><span>{session.user.email||session.user.id}</span></div></div></>}
 </div></div></div>;
}
