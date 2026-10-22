import {useCallback,useEffect,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
type Review={user_id:string;student_name:string;mobile_masked:string;nida_masked:string;inec_masked:string;nhif_masked:string;birth_masked:string;has_photo:boolean;status:'pending'|'approved'|'rejected';updated_at:string};
export function InstitutionIdentityReviews({supabase}:{supabase:SupabaseClient}){
 const [rows,setRows]=useState<Review[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState<string|null>(null),[error,setError]=useState('');
 const load=useCallback(async()=>{setLoading(true);const {data,error}=await supabase.rpc('pg_institution_identity_reviews');if(error)setError(error.message);else{setRows((data??[]) as Review[]);setError('')}setLoading(false)},[supabase]);
 useEffect(()=>{void load()},[load]);
 async function review(userId:string,approve:boolean){
  setBusy(userId);setError('');
  const {error}=await supabase.rpc('pg_institution_review_identity',{p_student:userId,p_approve:approve});
  if(error)setError(error.message);else await load();
  setBusy(null);
 }
 return <section className="pga-card" aria-label="Student identity verification" style={{marginTop:20}}>
  <div className="pga-dash-section-head"><div><h2>Student Identity Changes</h2><p>Review profile updates before issuing an institution verification badge. Identifiers are masked.</p></div><button type="button" className="pga-secondary" onClick={()=>void load()}>Refresh</button></div>
  {error&&<p className="pg-error" role="alert">{error}</p>}
  {loading?<p role="status">Loading identity requests…</p>:rows.length===0?<p>No identity submissions yet.</p>:
  <div className="pga-table-scroll"><table><thead><tr><th>Student</th><th>Mobile</th><th>NIDA</th><th>INEC</th><th>NHIF</th><th>Birth Certificate</th><th>Photo</th><th>Status</th><th>Review</th></tr></thead>
   <tbody>{rows.map(r=><tr key={r.user_id}><td>{r.student_name}</td><td>{r.mobile_masked||'—'}</td><td>{r.nida_masked||'—'}</td><td>{r.inec_masked||'—'}</td><td>{r.nhif_masked||'—'}</td><td>{r.birth_masked||'—'}</td><td>{r.has_photo?'Provided':'—'}</td><td>{r.status==='approved'?'✓ Approved':r.status==='pending'?'Pending review':'Rejected'}</td><td>{r.status!=='approved'&&<><button type="button" disabled={busy!==null} onClick={()=>void review(r.user_id,true)}>✓ Approve</button><button type="button" disabled={busy!==null} onClick={()=>void review(r.user_id,false)}>Reject</button></>}</td></tr>)}</tbody>
  </table></div>}
 </section>;
}
