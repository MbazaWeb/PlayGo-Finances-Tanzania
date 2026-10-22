import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
type Language='en'|'sw';
const translations={
 en:{language:'Language',theme:'Theme',light:'Light',dark:'Dark',system:'System',home:'Home',merchant:'Merchant',services:'Services',quickLoan:'Quick Loan',welcomeTitle:'Finance for student life.',welcomeText:'A simpler way to manage your student finances.',getStarted:'Get Started',powered:'Powered by Global Student System',loading:'Loading PlayGo...',preferences:'Appearance & language'},
 sw:{language:'Lugha',theme:'Mandhari',light:'Nyeupe',dark:'Nyeusi',system:'Mfumo',home:'Nyumbani',merchant:'Wafanyabiashara',services:'Huduma',quickLoan:'Mkopo wa Haraka',welcomeTitle:'Huduma za fedha kwa maisha ya mwanafunzi.',welcomeText:'Njia rahisi zaidi ya kusimamia fedha zako ukiwa mwanafunzi.',getStarted:'Anza Sasa',powered:'Inaendeshwa na Global Student System',loading:'PlayGo inapakia...',preferences:'Muonekano na lugha'}
};
type Key=keyof typeof translations.en;
type Settings={language:Language;setLanguage:(v:Language)=>void;t:(key:Key)=>string};
const Context=createContext<Settings|null>(null);
function getLanguage():Language{try{return localStorage.getItem('playgo-language')==='sw'?'sw':'en'}catch{return 'en'}}
export function PreferencesProvider({children}:{children:ReactNode}){
 const [language,setLanguage]=useState<Language>(getLanguage);
 useEffect(()=>{document.documentElement.lang=language;try{localStorage.setItem('playgo-language',language)}catch{/* unavailable */}},[language]);
 useEffect(()=>{document.documentElement.dataset.theme='light';document.documentElement.style.colorScheme='light';try{localStorage.removeItem('playgo-theme')}catch{/* unavailable */}},[]);
 return <Context.Provider value={{language,setLanguage,t:key=>translations[language][key]}}>{children}</Context.Provider>;
}
export function usePreferences(){const c=useContext(Context);if(!c)throw new Error('PreferencesProvider missing');return c}
export function PreferenceControls({compact=false}:{compact?:boolean}){
 const {language,setLanguage,t}=usePreferences();
 const [open,setOpen]=useState(false);
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!open)return;
  const close=(e:PointerEvent)=>{if(root.current&&!root.current.contains(e.target as Node))setOpen(false)};
  const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)};
  document.addEventListener('pointerdown',close);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',escape)};
 },[open]);
 return <div className={'pg-preferences'+(compact?' pg-preferences-compact':'')} ref={root}>
  <button type="button" className="pg-preferences-trigger" aria-label={t('language')} title={t('language')} aria-expanded={open} aria-haspopup="true" onClick={()=>setOpen(!open)}>
   <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 5-5 13 0 18M12 3c5 5 5 13 0 18"/></svg>
  </button>
  {open&&<div className="pg-preferences-menu" role="group" aria-label={t('preferences')}>
   <strong className="pg-preferences-title">{t('language')}</strong>
   <div className="pg-preferences-section">
    <span className="pg-preferences-label"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-5 5-5 13 0 18M12 3c5 5 5 13 0 18"/></svg>{t('language')}</span>
    <div className="pg-preferences-options"><button type="button" aria-pressed={language==='en'} className={language==='en'?'selected':''} onClick={()=>setLanguage('en')}>EN</button><button type="button" aria-pressed={language==='sw'} className={language==='sw'?'selected':''} onClick={()=>setLanguage('sw')}>SW</button></div>
   </div>
  </div>}
 </div>;
}
