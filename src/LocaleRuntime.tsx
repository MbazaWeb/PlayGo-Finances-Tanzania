import {useEffect} from 'react';
import {usePreferences} from './Preferences';

/** Compatibility translator for legacy JSX. Only known interface phrases are translated.
 * New UI should use usePreferences().t() directly. Never translates account data or amounts. */
const sw: Record<string,string> = {
 'Repayment Due':'Tarehe ya Marejesho','REPAYMENT DUE':'TAREHE YA MAREJESHO','Welcome to your student wallet.':'Karibu kwenye pochi yako ya mwanafunzi.','Hello':'Habari','Student Wallet':'Pochi ya Mwanafunzi',
 'Home':'Nyumbani','Dashboard':'Dashibodi','Overview':'Muhtasari','Welcome':'Karibu','Welcome back':'Karibu tena',
 'My Profile':'Wasifu Wangu','Profile':'Wasifu','Edit Profile':'Hariri Wasifu','Personal Information':'Taarifa Binafsi',
 'Notification Center':'Kituo cha Taarifa','Notifications':'Taarifa','No notifications yet':'Hakuna taarifa bado',
 'Settings':'Mipangilio','Appearance & language':'Muonekano na lugha','Language':'Lugha','Theme':'Mandhari',
 'English':'Kiingereza','Kiswahili':'Kiswahili','Light':'Nyeupe','Dark':'Nyeusi','System':'Mfumo',
 'Services':'Huduma','Merchant':'Mfanyabiashara','Merchants':'Wafanyabiashara','Wallet':'Pochi',
 'My Wallet':'Pochi Yangu','Wallet Balance':'Salio la Pochi','Available Balance':'Salio Linalopatikana',
 'Current Balance':'Salio la Sasa','Balance':'Salio','Total Balance':'Jumla ya Salio',
 'Add Money':'Ongeza Pesa','Send Money':'Tuma Pesa','Transfer Money':'Hamisha Pesa',
 'Bank Transfer':'Uhamisho wa Benki','Transfer to Bank':'Hamisha kwenda Benki',
 'Linked Accounts':'Akaunti Zilizounganishwa','Linked Bank Accounts':'Akaunti za Benki Zilizounganishwa',
 'Link Account':'Unganisha Akaunti','Account Details':'Maelezo ya Akaunti','Account Number':'Namba ya Akaunti',
 'Account Name':'Jina la Akaunti','Bank Name':'Jina la Benki','Select Bank':'Chagua Benki',
 'Transaction History':'Historia ya Miamala','History':'Historia','Transactions':'Miamala',
 'Recent Transactions':'Miamala ya Hivi Karibuni','Recent Activity':'Shughuli za Hivi Karibuni',
 'Transaction Details':'Maelezo ya Muamala','Transaction Status':'Hali ya Muamala',
 'Transaction ID':'Namba ya Muamala','Reference Number':'Namba ya Kumbukumbu',
 'Reference':'Kumbukumbu','Amount':'Kiasi','Enter Amount':'Weka Kiasi','Amount (TZS)':'Kiasi (TZS)',
 'Payment':'Malipo','Payments':'Malipo','Pay':'Lipa','Pay Now':'Lipa Sasa','Make Payment':'Fanya Malipo',
 'Confirm Payment':'Thibitisha Malipo','Payment Details':'Maelezo ya Malipo',
 'Payment Successful':'Malipo Yamefanikiwa','Payment Failed':'Malipo Yameshindikana',
 'Payment History':'Historia ya Malipo','Pay Merchant':'Lipa Mfanyabiashara',
 'Merchant Payment':'Malipo kwa Mfanyabiashara','Merchant Name':'Jina la Mfanyabiashara',
 'Scan QR Code':'Changanua Msimbo wa QR','Scan QR':'Changanua QR','Enter Merchant Code':'Weka Msimbo wa Mfanyabiashara',
 'Quick Loan':'Mkopo wa Haraka','Personal Boost Loan':'Mkopo wa Kujiinua',
 'My Loans':'Mikopo Yangu','Loan':'Mkopo','Loans':'Mikopo','Loan Amount':'Kiasi cha Mkopo',
 'Borrow':'Kopa','Borrow Now':'Kopa Sasa','Apply for Loan':'Omba Mkopo',
 'Loan Application':'Maombi ya Mkopo','Loan Details':'Maelezo ya Mkopo',
 'Loan Status':'Hali ya Mkopo','Loan Balance':'Salio la Mkopo',
 'Loan Repayment':'Marejesho ya Mkopo','Repay Loan':'Rejesha Mkopo',
 'Repay Now':'Rejesha Sasa','Repayment History':'Historia ya Marejesho',
 'Repayment Amount':'Kiasi cha Marejesho','Outstanding Balance':'Deni Lililobaki',
 'Outstanding':'Deni Lililobaki','Interest':'Riba','Interest Rate':'Kiwango cha Riba',
 'Penalty':'Adhabu','Penalties':'Adhabu','Due Date':'Tarehe ya Mwisho',
 'Next Due Date':'Tarehe Ijayo ya Malipo','Days Remaining':'Siku Zilizobaki',
 'Credit Score':'Alama za Mikopo','Credit Eligibility':'Ustahiki wa Mkopo',
 'Credit Limit':'Kikomo cha Mkopo','Available Credit':'Mkopo Unaopatikana',
 'Loan Limit':'Kikomo cha Mkopo','Eligible Transactions':'Miamala Inayokubalika',
 'Government Student Loan':'Mkopo wa Serikali kwa Wanafunzi','HESLB Loan':'Mkopo wa HESLB',
 'Student Loan':'Mkopo wa Mwanafunzi','Tuition Fees':'Ada za Masomo',
 'Tuition Payment':'Malipo ya Ada','Pay Tuition':'Lipa Ada','Fee Payment':'Malipo ya Ada',
 'Fee Payments':'Malipo ya Ada','Payment Progress':'Maendeleo ya Malipo',
 'Payment Trends':'Mwenendo wa Malipo','Institution':'Taasisi','Institutions':'Taasisi',
 'Institution Portal':'Mfumo wa Taasisi','Institution Dashboard':'Dashibodi ya Taasisi',
 'University':'Chuo Kikuu','University Name':'Jina la Chuo Kikuu',
 'Student':'Mwanafunzi','Students':'Wanafunzi','Student Details':'Maelezo ya Mwanafunzi',
 'Student Management':'Usimamizi wa Wanafunzi','Admission Number':'Namba ya Udahili',
 'Academic Year':'Mwaka wa Masomo','Courses':'Kozi','Course':'Kozi',
 'Requests':'Maombi','Student Requests':'Maombi ya Wanafunzi',
 'Pending Requests':'Maombi Yanayosubiri','Approve':'Idhinisha','Reject':'Kataa',
 'Approved':'Imeidhinishwa','Rejected':'Imekataliwa','Pending':'Inasubiri',
 'Inquiries':'Maswali','Support':'Msaada','Help':'Msaada',
 'Contact Support':'Wasiliana na Msaada','Contact Us':'Wasiliana Nasi',
 'Admin':'Msimamizi','Administrator':'Msimamizi','Admin Portal':'Mfumo wa Msimamizi',
 'Admin Dashboard':'Dashibodi ya Msimamizi','User Management':'Usimamizi wa Watumiaji',
 'Users':'Watumiaji','Active Users':'Watumiaji Hai','Total Students':'Jumla ya Wanafunzi',
 'Total Transactions':'Jumla ya Miamala','Total Payments':'Jumla ya Malipo',
 'Reports':'Ripoti','Analytics':'Takwimu','Statistics':'Takwimu',
 'Search':'Tafuta','Search Students':'Tafuta Wanafunzi','Search transactions':'Tafuta miamala',
 'Filter':'Chuja','All':'Zote','All Transactions':'Miamala Yote',
 'View All':'Tazama Zote','View Details':'Tazama Maelezo','Details':'Maelezo',
 'Continue':'Endelea','Next':'Endelea','Back':'Rudi','Go Back':'Rudi Nyuma',
 'Back to Services':'Rudi kwenye Huduma','Cancel':'Ghairi','Close':'Funga',
 'Confirm':'Thibitisha','Submit':'Wasilisha','Save':'Hifadhi','Save Changes':'Hifadhi Mabadiliko',
 'Edit':'Hariri','Update':'Sasisha','Delete':'Futa','Remove':'Ondoa',
 'Retry':'Jaribu Tena','Try Again':'Jaribu Tena','Refresh':'Onyesha Upya',
 'Loading...':'Inapakia...','Loading':'Inapakia','Processing...':'Inachakata...',
 'Please wait...':'Tafadhali subiri...','Success':'Imefanikiwa','Failed':'Imeshindikana',
 'Error':'Hitilafu','Something went wrong':'Kuna tatizo limetokea',
 'No transactions yet':'Hakuna miamala bado','No records found':'Hakuna taarifa zilizopatikana',
 'No data available':'Hakuna data inayopatikana','No results found':'Hakuna matokeo yaliyopatikana',
 'Date':'Tarehe','Time':'Muda','Status':'Hali','Type':'Aina','Description':'Maelezo',
 'Notes':'Maelezo ya Ziada','Note':'Maelezo','Fee':'Tozo','Fees':'Tozo',
 'Total':'Jumla','Subtotal':'Jumla Ndogo','Completed':'Imekamilika',
 'Active':'Hai','Inactive':'Haifanyi Kazi','Overdue':'Imechelewa',
 'Today':'Leo','Yesterday':'Jana','This Month':'Mwezi Huu',
 'Login':'Ingia','Log In':'Ingia','Sign In':'Ingia','Sign Up':'Jisajili',
 'Register':'Jisajili','Create Account':'Fungua Akaunti',
 'Already have an account?':'Tayari una akaunti?','Don’t have an account?':'Huna akaunti?',
 "Don't have an account?":'Huna akaunti?',
 'Logout':'Toka','Log Out':'Toka','Sign Out':'Toka',
 'Email':'Barua Pepe','Email Address':'Anwani ya Barua Pepe',
 'Password':'Nenosiri','Confirm Password':'Thibitisha Nenosiri',
 'Forgot Password?':'Umesahau Nenosiri?','Full Name':'Jina Kamili',
 'First Name':'Jina la Kwanza','Last Name':'Jina la Mwisho',
 'Phone Number':'Namba ya Simu','Mobile Number':'Namba ya Simu',
 'Verify OTP':'Thibitisha OTP','Enter OTP':'Weka OTP','Verification Code':'Msimbo wa Uthibitisho',
 'Resend Code':'Tuma Msimbo Tena','Verify':'Thibitisha',
 'Security':'Usalama','Privacy':'Faragha','Terms and Conditions':'Sheria na Masharti',
 'Demo App':'Programu ya Majaribio','Demo Mode':'Hali ya Majaribio',
 'Get Started':'Anza Sasa','Finance for student life.':'Huduma za fedha kwa maisha ya mwanafunzi.',
 'A simpler way to manage your student finances.':'Njia rahisi zaidi ya kusimamia fedha zako ukiwa mwanafunzi.',
 'Powered by Global Student System':'Inaendeshwa na Global Student System',
 'Welcome to PlayGo':'Karibu PlayGo','My Account':'Akaunti Yangu',
 'Add Bank Account':'Ongeza Akaunti ya Benki','Bank Account':'Akaunti ya Benki',
 'Available':'Inapatikana','Unavailable':'Haipatikani','Required':'Inahitajika',
 'Optional':'Si Lazima','Copied':'Imenakiliwa','Copy':'Nakili',
 'Download':'Pakua','Download Receipt':'Pakua Risiti','Receipt':'Risiti',
 'View Receipt':'Tazama Risiti','Print':'Chapisha',
 'Your balance':'Salio lako','Enter your password':'Weka nenosiri lako',
 'Enter your email':'Weka barua pepe yako','Enter phone number':'Weka namba ya simu',
 'Select Institution':'Chagua Taasisi','Select University':'Chagua Chuo Kikuu',
 'Select':'Chagua','Please select':'Tafadhali chagua',
 'Send':'Tuma','Receive':'Pokea','Received':'Imepokelewa','Sent':'Imetumwa',
 'Deposit':'Weka Pesa','Withdraw':'Toa Pesa','Top Up':'Ongeza Pesa',
 'Bank':'Benki','Merchant Code':'Msimbo wa Mfanyabiashara',
 'Transfer':'Hamisha','Payment Method':'Njia ya Malipo',
 'Continue to Payment':'Endelea na Malipo','Review Payment':'Kagua Malipo',
 'Confirm Transfer':'Thibitisha Uhamisho','Transfer Successful':'Uhamisho Umefanikiwa',
 'New Transaction':'Muamala Mpya','Transaction Fee':'Tozo ya Muamala',
 'Quick Actions':'Vitendo vya Haraka','Manage':'Simamia','Manage Account':'Simamia Akaunti',
 'Recent Payments':'Malipo ya Hivi Karibuni','View History':'Tazama Historia',
 'Apply Now':'Omba Sasa','Learn More':'Jifunze Zaidi',
 'Send Request':'Tuma Ombi','Request Status':'Hali ya Ombi',
 'Accept':'Kubali','Decline':'Kataa','Reset':'Weka Upya',
 'Clear':'Futa','Clear All':'Futa Vyote','Mark as Read':'Weka kama Imesomwa',
 'Read More':'Soma Zaidi','Show More':'Onyesha Zaidi','Show Less':'Onyesha Kidogo',
 'Loading PlayGo...':'PlayGo inapakia...',
};
const originals=new WeakMap<Text,string>();
const attributes=new WeakMap<Element,Map<string,string>>();
const attrNames=['placeholder','title','aria-label','alt'];
const SKIP='script,style,textarea,code,pre,[contenteditable="true"],[data-no-translate]';
function translate(value:string,language:'en'|'sw'){
 if(language==='en')return value;
 const trimmed=value.trim();
 const exact=sw[trimmed]??sw[trimmed.replace(/[.!?:]+$/,'')];
 if(!exact){const match=trimmed.match(/^(REPAYMENT DUE|Repayment Due|LOAN OUTSTANDING|AVAILABLE BALANCE|PLAYGO ACCOUNT NUMBER)(\s*[·:]\s*.*)$/);if(match&&sw[match[1]])return value.replace(trimmed,sw[match[1]]+match[2]);return value;}
 const leading=value.match(/^\s*/)?.[0]??'';
 const trailing=value.match(/\s*$/)?.[0]??'';
 const suffix=sw[trimmed]?'':trimmed.slice(trimmed.replace(/[.!?:]+$/,'').length);
 return leading+exact+suffix+trailing;
}
function localizeNode(root:Node,language:'en'|'sw'){
 const walk=(node:Node)=>{
  if(node.nodeType===Node.TEXT_NODE){
   const text=node as Text;
   const parent=text.parentElement;
   if(!parent||parent.closest(SKIP))return;
   const last=originals.get(text);
   const current=text.nodeValue??'';
   if(last===undefined)originals.set(text,current);
   else if(current!==translate(last,'sw')&&current!==last)originals.set(text,current);
   const original=originals.get(text)??current;
   const next=translate(original,language);
   if(current!==next)text.nodeValue=next;
  }else if(node.nodeType===Node.ELEMENT_NODE){
   const element=node as Element;
   if(element.matches(SKIP))return;
   let saved=attributes.get(element);
   if(!saved){saved=new Map();attributes.set(element,saved)}
   for(const name of attrNames){
    const current=element.getAttribute(name);
    if(current===null)continue;
    const old=saved.get(name);
    if(old===undefined||current!==translate(old,'sw')&&current!==old)saved.set(name,current);
    const next=translate(saved.get(name)??current,language);
    if(next!==current)element.setAttribute(name,next);
   }
   for(const child of Array.from(element.childNodes))walk(child);
  }
 };
 walk(root);
}
export function LegacyLocaleBridge(){
 const {language}=usePreferences();
 useEffect(()=>{
  const body=document.body;
  let processing=false;
  const apply=()=>{if(processing)return;processing=true;observer.disconnect();localizeNode(body,language);observer.observe(body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:attrNames});processing=false};
  const observer=new MutationObserver(apply);
  apply();
  return()=>observer.disconnect();
 },[language]);
 return null;
}
