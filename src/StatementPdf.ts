export type StatementTransaction={id:string;kind:string;amount_tzs:number;delta_tzs:number;note:string|null;created_at:string};
const ascii=(value:string)=>value.normalize('NFKD').replace(/[^\x20-\x7E]/g,'?');
const esc=(value:string)=>ascii(value).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
const fmt=(value:number)=>Math.abs(value).toLocaleString('en-US',{maximumFractionDigits:0});
export function downloadAccountStatementPdf(account:string,holder:string,transactions:StatementTransaction[],closingBalance:number){
 const ordered=[...transactions].sort((a,b)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime()||a.id.localeCompare(b.id));
 const net=ordered.reduce((sum,t)=>sum+Number(t.delta_tzs),0);
 const opening=closingBalance-net;
 const credits=ordered.filter(t=>Number(t.delta_tzs)>0).reduce((s,t)=>s+Number(t.delta_tzs),0);
 const debits=ordered.filter(t=>Number(t.delta_tzs)<0).reduce((s,t)=>s-Number(t.delta_tzs),0);
 let running=opening;
 const lines:{text:string;x:number;y:number;size:number;bold:boolean}[][]=[];
 let page:{text:string;x:number;y:number;size:number;bold:boolean}[]=[];
 let y=780;
 const add=(text:string,x=42,size=10,bold=false,step=18)=>{if(y<66){lines.push(page);page=[];y=780;}page.push({text,x,y,size,bold});y-=step;};
 const row=(date:string,description:string,ref:string,credit:string,debit:string,balance:string)=>{
  add(date,42,8,false,0);page.push({text:description.slice(0,30),x:122,y,size:8,bold:false},{text:ref.slice(0,8),x:306,y,size:8,bold:false},{text:credit,x:371,y,size:8,bold:false},{text:debit,x:447,y,size:8,bold:false},{text:balance,x:520,y,size:8,bold:false});y-=22;
 };
 add('PLAYGO FINANCES TANZANIA',42,17,true,27);
 add('ACCOUNT STATEMENT',42,14,true,26);
 add('Account holder: '+holder,42,10,false,18);
 add('PlayGo account: '+account,42,10,false,18);
 add('Generated: '+new Date().toLocaleString('en-GB'),42,9,false,22);
 add('Opening balance: TZS '+fmt(opening),42,10,true,18);
 add('Total credits: TZS '+fmt(credits)+'   Total debits: TZS '+fmt(debits),42,10,false,18);
 add('Closing balance: TZS '+fmt(closingBalance),42,11,true,24);
 add('DATE                TRANSACTION                             REF         CREDIT       DEBIT       BALANCE',42,8,true,23);
 if(!ordered.length)add('No transactions recorded for this account.',42,10,false,22);
 for(const t of ordered){running+=Number(t.delta_tzs);const d=Number(t.delta_tzs);row(new Date(t.created_at).toLocaleDateString('en-GB'),t.kind||'Transaction',t.id,d>0?fmt(d):'-',d<0?fmt(-d):'-',fmt(running));}
 if(y<95){lines.push(page);page=[];y=780;}
 add('Statement reflects recorded PlayGo transactions. Demo App.',42,8,false,15);
 lines.push(page);
 const objects:string[]=[];const push=(obj:string)=>{objects.push(obj);return objects.length;};
 const catalog=push('');const pages=push('');const regular=push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');const bold=push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
 const pageIds:number[]=[];
 for(let p=0;p<lines.length;p++){const commands=['0.12 0.15 0.2 rg'];for(const item of lines[p])commands.push('BT /'+(item.bold?'F2':'F1')+' '+item.size+' Tf '+item.x+' '+item.y+' Td ('+esc(item.text)+') Tj ET');commands.push('BT /F1 8 Tf 42 32 Td (Page '+(p+1)+' of '+lines.length+') Tj ET');const stream=commands.join('\n');const streamId=push('<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream');const pageId=push('<< /Type /Page /Parent '+pages+' 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 '+regular+' 0 R /F2 '+bold+' 0 R >> >> /Contents '+streamId+' 0 R >>');pageIds.push(pageId);}
 objects[catalog-1]='<< /Type /Catalog /Pages '+pages+' 0 R >>';objects[pages-1]='<< /Type /Pages /Kids ['+pageIds.map(id=>id+' 0 R').join(' ')+'] /Count '+pageIds.length+' >>';
 let pdf='%PDF-1.4\n';const offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(pdf.length);pdf+=(i+1)+' 0 obj\n'+objects[i]+'\nendobj\n';}
 const xref=pdf.length;pdf+='xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n';for(let i=1;i<offsets.length;i++)pdf+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';pdf+='trailer\n<< /Size '+(objects.length+1)+' /Root '+catalog+' 0 R >>\nstartxref\n'+xref+'\n%%EOF';
 const blob=new Blob([new Uint8Array([...pdf].map(c=>c.charCodeAt(0)))],{type:'application/pdf'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='PlayGo-Statement-'+account+'.pdf';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
