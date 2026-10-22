import { useEffect, useState, type FormEvent } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { usePreferences } from './Preferences';

type Identity = { mobile_number:string; nida_number:string; inec_number:string; nhif_number:string; birth_certificate_number:string; passport_photo_path:string|null };
const empty:Identity={mobile_number:'',nida_number:'',inec_number:'',nhif_number:'',birth_certificate_number:'',passport_photo_path:null};
const fields: {key:Exclude<keyof Identity,'passport_photo_path'>;en:string;sw:string;hint:string}[]=[
 {key:'mobile_number',en:'Mobile number',sw:'Namba ya simu',hint:'+2557XXXXXXXX'},
 {key:'nida_number',en:'NIDA number',sw:'Namba ya NIDA',hint:'20 digits'},
 {key:'inec_number',en:'INEC / Voter ID number',sw:'Namba ya INEC / Mpiga kura',hint:'Voter ID'},
 {key:'nhif_number',en:'NHIF number',sw:'Namba ya NHIF',hint:'NHIF membership number'},
 {key:'birth_certificate_number',en:'Birth certificate number',sw:'Namba ya cheti cha kuzaliwa',hint:'Certificate reference'}
];
export function StudentIdentity({userId,supabase}:{userId:string;supabase:SupabaseClient}){
 const {language}=usePreferences();const sw=language==='sw';
 const [editing,setEditing]=useState(false),[approval,setApproval]=useState<'pending'|'approved'|'rejected'|null>(null),[form,setForm]=useState<Identity>(empty),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[photo,setPhoto]=useState<File|null>(null),[photoUrl,setPhotoUrl]=useState<string|null>(null);
 useEffect(()=>{let active=true;setLoading(true);void supabase.from('pg_student_identity').select('mobile_number,nida_number,inec_number,nhif_number,birth_certificate_number,passport_photo_path,verification_status').eq('user_id',userId).maybeSingle().then(({data,error})=>{if(!active)return;if(error)setError(sw?'Imeshindikana kupakia taarifa za utambulisho.':'Could not load identification details.');else if(data){setForm({...empty,...data});setApproval((data as {verification_status?:'pending'|'approved'|'rejected'}).verification_status??null)}setLoading(false)});return()=>{active=false}},[supabase,userId]);
 useEffect(()=>{let active=true;if(!form.passport_photo_path){setPhotoUrl(null);return}void supabase.storage.from('pg-student-identity').createSignedUrl(form.passport_photo_path,120).then(({data})=>{if(active)setPhotoUrl(data?.signedUrl??null)});return()=>{active=false}},[supabase,form.passport_photo_path]);
 async function save(e:FormEvent){e.preventDefault();setError('');setNotice('');
  const mobile=form.mobile_number.replace(/[\s-]/g,'');
  if(mobile&&!/^(?:\+255|0)[67]\d{8}$/.test(mobile)){setError(sw?'Weka namba sahihi ya simu ya Tanzania.':'Enter a valid Tanzanian mobile number.');return}
  if(form.nida_number&&!/^\d{20}$/.test(form.nida_number)){setError(sw?'Namba ya NIDA inahitaji tarakimu 20.':'NIDA number must contain 20 digits.');return}
  if(photo&&(!['image/jpeg','image/png','image/webp'].includes(photo.type)||photo.size>2*1024*1024)){setError(sw?'Tumia JPG, PNG au WebP isiyozidi 2 MB.':'Use JPG, PNG or WebP up to 2 MB.');return}
  setSaving(true);
  try{
   let path=form.passport_photo_path;
   if(photo){path=`${userId}/passport.${photo.type==='image/png'?'png':photo.type==='image/webp'?'webp':'jpg'}`;const uploaded=await supabase.storage.from('pg-student-identity').upload(path,photo,{upsert:true,contentType:photo.type,cacheControl:'60'});if(uploaded.error)throw uploaded.error}
   const {error:saveError}=await supabase.from('pg_student_identity').upsert({user_id:userId,mobile_number:mobile,nida_number:form.nida_number.trim(),inec_number:form.inec_number.trim(),nhif_number:form.nhif_number.trim(),birth_certificate_number:form.birth_certificate_number.trim(),passport_photo_path:path},{onConflict:'user_id'});
   if(saveError)throw saveError;
   setForm(v=>({...v,mobile_number:mobile,passport_photo_path:path}));setPhoto(null);setApproval('pending');setEditing(false);setNotice(sw?'Taarifa zimehifadhiwa.':'Details saved successfully.');
  }catch{setError(sw?'Imeshindikana kuhifadhi. Hakikisha database na storage zimeandaliwa.':'Could not save. Check that the database and storage are configured.')}finally{setSaving(false)}
 }
 return <section className="pg-profile-card pg-identity-card"><div className="pg-identity-heading"><h2>{sw?'Utambulisho na Mawasiliano':'Identification & Contact Details'}</h2><button type="button" className="pg-identity-edit" aria-label={sw?'Hariri taarifa':'Edit details'} title={sw?'Hariri taarifa':'Edit details'} onClick={()=>{setEditing(v=>!v);setError('');setNotice('')}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m16 4 4 4-12 12H4v-4L16 4Z"/><path d="m14 6 4 4"/></svg> {editing?(sw?'Ghairi':'Cancel'):(sw?'Hariri':'Edit')}</button></div><p className="pg-identity-status">{approval==='approved'?'✓ '+(sw?'Mabadiliko yameidhinishwa na chuo':'Changes approved by institution'):approval==='pending'?(sw?'Inasubiri uthibitisho wa chuo':'Pending institution review'):approval==='rejected'?(sw?'Mabadiliko yamekataliwa; hariri tena':'Changes rejected; edit again'):(sw?'Bado haijathibitishwa':'Not verified')}</p><p className="pg-identity-help">{sw?'Taarifa hizi ni za faragha. Usijaze PIN au nenosiri.':'These details are private. Never enter PINs or passwords.'}</p>
 {loading?<p role="status">{sw?'Inapakia…':'Loading…'}</p>:<form className="pg-identity-form" onSubmit={e=>void save(e)}>
 <div className="pg-identity-grid">{fields.map(f=><label key={f.key}><span>{sw?f.sw:f.en}</span><input disabled={!editing||saving} type="text" autoComplete={f.key==='mobile_number'?'tel':'off'} inputMode={f.key==='mobile_number'||f.key==='nida_number'?'numeric':'text'} maxLength={f.key==='nida_number'?20:60} placeholder={f.hint} value={form[f.key]} onChange={e=>setForm(v=>({...v,[f.key]:e.target.value}))}/></label>)}</div>
 <label className="pg-identity-upload"><span>{sw?'Picha ya passport size':'Passport-size photo'}</span>{photoUrl&&<img src={photoUrl} alt={sw?'Picha ya utambulisho':'Identity photo'} width="96" height="112" style={{objectFit:'cover',borderRadius:8,display:'block',margin:'8px 0'}}/>}<input disabled={!editing||saving} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setPhoto(e.target.files?.[0]??null)}/><small>{sw?'JPG, PNG au WebP · Isizidi 2 MB':'JPG, PNG or WebP · Max 2 MB'}</small></label>
 {error&&<p role="alert" className="pg-error">{error}</p>}{notice&&<p role="status">{notice}</p>}
 {editing&&<button type="submit" className="pg-button" disabled={saving}>{saving?(sw?'Inahifadhi…':'Saving…'):(sw?'Hifadhi taarifa':'Save details')}</button>}</form>}</section>
}
