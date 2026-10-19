import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import './styles.css';
import { MerchantPage } from './Merchant';
import { ServicesPage } from './Services';
import { WalletSummary, LinkedAccounts, FeePage, TransferPage, AddMoneyPage, History, TransactionOtp, TransactionStatus } from './Wallet';

const LOGO = '/branding/playgo-white.png';
const ACCOUNTS_KEY = 'playgo.demo.accounts.v1';
const SESSION_KEY = 'playgo.demo.session.v1';
const PENDING_KEY = 'playgo.demo.pending.v1';

type Account = { accountNumber: string; fullName: string; institution: string; admission: string; mobileNumber: string; email: string; demoPin: string; createdAt: string };
type Pending = Omit<Account, 'accountNumber' | 'createdAt'>;

function readJSON<T>(key: string, fallback: T): T {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}
function accounts(): Account[] { return readJSON<Account[]>(ACCOUNTS_KEY, []); }
function makeAccountNumber(mobileNumber: string): string {
  const digits = mobileNumber.replace(/\D/g, '');
  const normalized = digits.startsWith('255') ? '0' + digits.slice(3) : digits;
  if (!/^0[67]\d{8}$/.test(normalized)) throw new Error('Invalid Tanzanian mobile number.');
  return '09' + normalized.slice(-8);
}
function useDemoSession() {
  const [session, setSession] = useState<string | null>(() => localStorage.getItem(SESSION_KEY));
  return { session, signIn: (number: string) => { localStorage.setItem(SESSION_KEY, number); setSession(number); }, signOut: () => { localStorage.removeItem(SESSION_KEY); setSession(null); } };
}

function Splash() {
  const navigate = useNavigate();
  useEffect(() => { const timer = setTimeout(() => navigate('/welcome', { replace: true }), 1800); return () => clearTimeout(timer); }, [navigate]);
  return <main className="pg-center"><img className="pg-logo" src={LOGO} alt="PlayGo Tanzania Limited" /><div className="pg-loader" aria-label="Loading" /></main>;
}
function Welcome() { return <main className="pg-center pg-welcome"><img className="pg-logo" src={LOGO} alt="PlayGo Tanzania Limited" /><p className="pg-eyebrow">PLAYGO FINANCES</p><h1>Finance for student life.</h1><p>A simpler way to manage your student finances.</p><Link className="pg-button" to="/login">Get Started →</Link><small>Powered by Global Student System</small></main>; }

function Login({ signIn }: { signIn: (number: string) => void }) {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('');
    const data = new FormData(e.currentTarget);
    const number = String(data.get('accountNumber') || '').trim().toUpperCase();
    const pin = String(data.get('demoPin') || '');
    const match = accounts().find(a => a.accountNumber === number && a.demoPin === pin);
    if (!match) { setError('Account number or demo PIN is incorrect.'); return; }
    signIn(match.accountNumber); navigate('/dashboard', { replace: true });
  }
  return <main className="pg-page"><section className="pg-panel"><Link to="/welcome" className="pg-back">← Back</Link><img className="pg-logo pg-small" src={LOGO} alt="PlayGo Tanzania Limited" /><p className="pg-eyebrow">PLAYGO FINANCES · DEMO</p><h1>Student Login</h1><p>Enter your PlayGo account number and demo PIN.</p><form onSubmit={submit} className="pg-form"><label htmlFor="accountNumber">Account Number</label><input id="accountNumber" name="accountNumber" autoComplete="username" required placeholder="09XXXXXXXX" /><label htmlFor="demoPin">Demo PIN</label><input id="demoPin" name="demoPin" type="password" inputMode="numeric" pattern="[0-9]{4,6}" autoComplete="off" required placeholder="4–6 digit demo PIN" /><button className="pg-button" type="submit">Log In →</button>{error && <p className="pg-error" role="alert">{error}</p>}</form><p className="pg-switch">Don't have an account? <Link to="/register">Sign Up</Link></p><p className="pg-note">Local demo only. This is not real authentication.</p></section></main>;
}
function Register() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError('');
    const d = new FormData(e.currentTarget);
    const fullName = String(d.get('fullName') || '').trim();
    const institution = String(d.get('institution') || '').trim();
    const admission = String(d.get('admission') || '').trim();
    const mobileNumber = String(d.get('mobileNumber') || '').trim();
    const nida = String(d.get('nida') || '').trim();
    const email = String(d.get('email') || '').trim().toLowerCase();
    const demoPin = String(d.get('demoPin') || '');
    const confirmPin = String(d.get('confirmPin') || '');
    if (!fullName || !institution || !admission || !mobileNumber || !email || !/^[0-9]{20}$/.test(nida)) { setError('Complete all required fields. NIDA must contain 20 digits.'); return; }
    if (!/^(?:0[67]\d{8}|255[67]\d{8}|\+255[67]\d{8})$/.test(mobileNumber.replace(/[\s-]/g, ''))) { setError('Enter a valid Tanzanian mobile number.'); return; }
    if (!/^[0-9]{4,6}$/.test(demoPin) || demoPin !== confirmPin) { setError('Demo PIN must be 4–6 digits and match confirmation.'); return; }
    if (accounts().some(a => a.institution.toLowerCase() === institution.toLowerCase() && a.admission.toLowerCase() === admission.toLowerCase())) { setError('A demo account already exists for this institution and registration number.'); return; }
    if (accounts().some(a => a.accountNumber === makeAccountNumber(mobileNumber))) { setError('This mobile number already has a demo account.'); return; }
    // NIDA is checked for format only and deliberately never persisted.
    const pending: Pending = { fullName, institution, admission, mobileNumber, email, demoPin };
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    navigate('/otp');
  }
  return <main className="pg-page"><section className="pg-panel"><Link to="/login" className="pg-back">← Back to login</Link><img className="pg-logo pg-small" src={LOGO} alt="PlayGo Tanzania Limited" /><p className="pg-eyebrow">PLAYGO FINANCES · DEMO</p><h1>Create student account</h1><p>All fields are required. Verification is simulated.</p><form className="pg-form" onSubmit={submit}>
    <label htmlFor="fullName">Full Name</label><input id="fullName" name="fullName" autoComplete="name" required placeholder="Student full name" />
    <label htmlFor="institution">Institution / University</label><input id="institution" name="institution" required placeholder="Your institution" />
    <label htmlFor="admission">Admission / Registration Number</label><input id="admission" name="admission" required placeholder="Your student registration number" />
    <label htmlFor="mobileNumber">Mobile Number</label><input id="mobileNumber" name="mobileNumber" type="tel" autoComplete="tel" required placeholder="0712345678" />
    <label htmlFor="nida">NIDA Number (NIN)</label><input id="nida" name="nida" inputMode="numeric" pattern="[0-9]{20}" maxLength={20} required placeholder="20-digit NIDA number" /><small className="pg-hint">Format checked only; not stored.</small>
    <label htmlFor="email">Email Address</label><input id="email" name="email" type="email" autoComplete="email" required placeholder="student@example.com" />
    <label htmlFor="demoPin">Create Demo PIN</label><input id="demoPin" name="demoPin" type="password" inputMode="numeric" pattern="[0-9]{4,6}" autoComplete="off" required placeholder="4–6 digits (not a real password)" />
    <label htmlFor="confirmPin">Confirm Demo PIN</label><input id="confirmPin" name="confirmPin" type="password" inputMode="numeric" pattern="[0-9]{4,6}" autoComplete="off" required placeholder="Repeat demo PIN" />
    <button className="pg-button" type="submit">Continue to OTP →</button>{error && <p className="pg-error" role="alert">{error}</p>}
  </form><p className="pg-switch">Already have an account? <Link to="/login">Log In</Link></p><p className="pg-note">This demo uses browser storage, not a secure database. Use fictional test details and a throwaway PIN.</p></section></main>;
}
function OTP() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  // Pending data lives in sessionStorage, not localStorage.
  const raw = sessionStorage.getItem(PENDING_KEY);
  if (!raw) return <Navigate to="/register" replace />;
  const mobile = (() => { try { return (JSON.parse(raw) as Pending).mobileNumber; } catch { return ''; } })();
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (code !== '123456') { setError('Incorrect demo OTP. Use 123456.'); return; }
    sessionStorage.setItem('playgo.demo.otp-approved.v1', 'yes');
    navigate('/verification', { replace: true });
  }
  return <main className="pg-page"><section className="pg-panel">
    <Link to="/register" className="pg-back">← Back to registration</Link>
    <img className="pg-logo pg-small" src={LOGO} alt="PlayGo Tanzania Limited" />
    <p className="pg-eyebrow">PLAYGO FINANCES · DEMO</p>
    <h1>Verify Mobile Number</h1>
    <p>Enter the six-digit demo OTP for {mobile}. No SMS is sent.</p>
    <div className="pg-otp-hint">Demo OTP: <strong>123456</strong></div>
    <form className="pg-form" onSubmit={submit}>
      <label htmlFor="otp">One-Time Password (OTP)</label>
      <input id="otp" name="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0,6))} placeholder="Enter 6-digit OTP" required />
      <button type="submit" className="pg-button">Verify & Continue →</button>
      {error && <p role="alert" className="pg-error">{error}</p>}
    </form>
    <p className="pg-note">Demo only. This OTP does not verify ownership of a phone number.</p>
  </section></main>;
}

const checks = ['Registration details', 'Identity format check (demo)', 'Institution enrollment (simulated)', 'Demo account provisioning', 'Local data synchronization'];
function Verification({ signIn }: { signIn: (number: string) => void }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<Account | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!sessionStorage.getItem(PENDING_KEY)) { navigate('/register', { replace: true }); return; }
    if (sessionStorage.getItem('playgo.demo.otp-approved.v1') !== 'yes') { navigate('/otp', { replace: true }); return; }
    if (step < checks.length) { const t = setTimeout(() => setStep(s => s + 1), 950); return () => clearTimeout(t); }
    try {
      const raw = sessionStorage.getItem(PENDING_KEY);
      if (!raw) throw new Error('Registration details expired.');
      const data = JSON.parse(raw) as Pending;
      const existing = accounts();
      const created: Account = { ...data, accountNumber: makeAccountNumber(data.mobileNumber), createdAt: new Date().toISOString() };
      if (existing.some(a => a.accountNumber === created.accountNumber)) throw new Error('Duplicate account');
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([...existing, created]));
      sessionStorage.removeItem(PENDING_KEY);
      sessionStorage.removeItem('playgo.demo.otp-approved.v1');
      setResult(created);
    } catch { setError('Could not save demo account. Check browser storage settings and try again.'); }
  }, [step, navigate]);
  return <main className="pg-page"><section className="pg-panel"><p className="pg-eyebrow">PLAYGO FINANCES · DEMO</p><h1>System Checks</h1><p>Demonstration only: no official NIDA, university, or banking verification is performed.</p><div className="pg-progress-head"><span>{result ? 'Demo account ready' : 'Processing demo checks'}</span><strong>{Math.round(step / checks.length * 100)}%</strong></div><div className="pg-progress"><div style={{ width: `${step / checks.length * 100}%` }} /></div><div className="pg-steps">{checks.map((name, i) => <div className="pg-step" key={name}><span aria-hidden="true">{i < step ? '✓' : i === step ? '◌' : '○'}</span><div><strong>{name}</strong><small>{i < step ? 'Demo complete' : i === step ? 'In progress' : 'Waiting'}</small></div></div>)}</div>{result && <div className="pg-success" role="status"><strong>Welcome to PlayGo Finances!</strong><p>Congratulations, <b>{result.fullName}</b>. Your demo student account has been created.</p><p>Your PlayGo Account Number: <b>{result.accountNumber}</b></p><p>Keep this number for future demo logins.</p><button className="pg-button" onClick={() => { signIn(result.accountNumber); navigate('/dashboard', { replace: true }); }}>Continue to Dashboard →</button></div>}{error && <p className="pg-error" role="alert">{error}</p>}</section></main>;
}
type StudentTab = 'home' | 'merchant' | 'services' | 'profile';
const tabs: { key: StudentTab; title: string; icon: string; route: string }[] = [
  { key: 'home', title: 'Home', icon: '⌂', route: '/dashboard' },
  { key: 'merchant', title: 'Merchant', icon: '▣', route: '/merchant' },
  { key: 'services', title: 'Services', icon: '▦', route: '/services' },
  { key: 'profile', title: 'Profile', icon: '♙', route: '/profile' },
];
function StudentNavigation({ active }: { active: StudentTab }) {
  return <nav className="pg-bottom-nav" aria-label="Student navigation">
    {tabs.map(tab => <Link key={tab.key} to={tab.route} className={'pg-nav-item' + (active === tab.key ? ' pg-nav-active' : '')} aria-current={active === tab.key ? 'page' : undefined}>
      <span className="pg-nav-icon" aria-hidden="true">{tab.icon}</span><span>{tab.title}</span>
    </Link>)}
  </nav>;
}
function StudentArea({ session, signOut, active }: { session: string | null; signOut: () => void; active: StudentTab }) {
  const navigate = useNavigate();
  const account = accounts().find(a => a.accountNumber === session);
  if (!account) return <Navigate to="/login" replace />;
  return <main className="pg-page pg-student-page"><section className="pg-panel">
    <img className="pg-logo pg-small" src={LOGO} alt="PlayGo Tanzania Limited" />
    <p className="pg-eyebrow">PLAYGO FINANCES · DEMO</p>
    {active === 'home' && <>
      <h1>Hello, {account.fullName.split(' ')[0]}!</h1>
      <p>Welcome to your student wallet.</p>
      <WalletSummary account={account.accountNumber} fullName={account.fullName} institution={account.institution} />
    </>}
    {active === 'merchant' && <>
      <MerchantPage account={account.accountNumber} />
    </>}
    {active === 'services' && <>
      <ServicesPage account={account.accountNumber} institution={account.institution} />
    </>}
    {active === 'profile' && <>
      <h1>My Profile</h1><p>Your locally saved demo student information.</p>
      <div className="pg-details">
        <p><strong>Full Name</strong><span>{account.fullName}</span></p>
        <p><strong>Account Number</strong><span>{account.accountNumber}</span></p>
        <p><strong>Institution</strong><span>{account.institution}</span></p>
        <p><strong>Registration Number</strong><span>{account.admission}</span></p>
        <p><strong>Mobile Number</strong><span>{account.mobileNumber}</span></p>
        <p><strong>Email</strong><span>{account.email}</span></p>
      </div>
      <LinkedAccounts account={account.accountNumber} />
      <button className="pg-button pg-outline" onClick={() => { signOut(); navigate('/login', { replace: true }); }}>Log Out</button>
    </>}
    <p className="pg-note">Demo only. Data is stored in this browser; no real banking or verification.</p>
  </section><StudentNavigation active={active} /></main>;
}
function WalletRoute({ session, page }: { session: string | null; page: 'fee'|'transfer'|'topup'|'otp'|'status'|'history' }) {
  const account = accounts().find(a => a.accountNumber === session);
  if (!account) return <Navigate to="/login" replace />;
  const findAccount = (number: string) => accounts().find(a => a.accountNumber === number)?.fullName;
  return <main className="pg-page pg-student-page"><section className="pg-panel">
    {page === 'fee' && <FeePage account={account.accountNumber} />}
    {page === 'transfer' && <TransferPage account={account.accountNumber} findAccount={findAccount} />}
    {page === 'topup' && <p>Use the secure student wallet for linked NMB demo top-ups.</p>}
    {page === 'otp' && <TransactionOtp account={account.accountNumber} findAccount={findAccount} />}
    {page === 'status' && <TransactionStatus account={account.accountNumber} />}
    {page === 'history' && <><Link to="/dashboard" className="pg-back">← Back to Home</Link><h1>Transaction History</h1><History account={account.accountNumber} /></>}
  </section><StudentNavigation active="home" /></main>;
}
export default function App() {
  const { session, signIn, signOut } = useDemoSession();
  return <Routes><Route path="/" element={<Splash />} /><Route path="/welcome" element={<Welcome />} /><Route path="/login" element={<Login signIn={signIn} />} /><Route path="/register" element={<Register />} /><Route path="/otp" element={<OTP />} /><Route path="/verification" element={<Verification signIn={signIn} />} /><Route path="/dashboard" element={<StudentArea session={session} signOut={signOut} active="home" />} /><Route path="/merchant" element={<StudentArea session={session} signOut={signOut} active="merchant" />} /><Route path="/services" element={<StudentArea session={session} signOut={signOut} active="services" />} /><Route path="/profile" element={<StudentArea session={session} signOut={signOut} active="profile" />} /><Route path="/pay-fee" element={<WalletRoute session={session} page="fee" />} /><Route path="/transfer" element={<WalletRoute session={session} page="transfer" />} /><Route path="/transfer-bank" element={<WalletRoute session={session} page="transfer" />} /><Route path="/add-money" element={<WalletRoute session={session} page="topup" />} /><Route path="/transaction-otp" element={<WalletRoute session={session} page="otp" />} /><Route path="/transaction-status" element={<WalletRoute session={session} page="status" />} /><Route path="/history" element={<WalletRoute session={session} page="history" />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>;
}
