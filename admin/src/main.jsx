import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  onAuthStateChanged,
  signInWithPhoneNumber,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import './styles.css';

const firebaseConfig = {
  apiKey: 'AIzaSyCrW0Fk55Cr6z5Uxrgze1py37A7Aa5x5uc',
  authDomain: 'jb-star-7c8e7.firebaseapp.com',
  projectId: 'jb-star-7c8e7',
  storageBucket: 'jb-star-7c8e7.firebasestorage.app',
  messagingSenderId: '209045478988',
  appId: '1:209045478988:web:ae8fed683896f8eb2a5ee9',
  measurementId: 'G-0EPVH7BB30',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Replace this placeholder with the authorized administrator's Firebase Auth UID before enabling Admin access.
const ADMIN_UID = 'GK24JSFswVerd7cqvhdfmHPb93K3';

function Login({ phone, setPhone, code, setCode, confirmation, setConfirmation, msg, setMsg }) {
  const recaptcha = useRef(null);

  async function sendOtp(event) {
    event.preventDefault();
    setMsg('');
    const digits = phone.trim().replace(/[\s()-]/g, '');
    const normalizedPhone = digits.startsWith('+')
      ? digits
      : digits.startsWith('91') && digits.length === 12
        ? `+${digits}`
        : digits.length === 10
          ? `+91${digits}`
          : '';
    if (!/^\+[1-9]\d{7,14}$/.test(normalizedPhone)) {
      setMsg('Enter a valid phone number, e.g. +91 9876543210.');
      return;
    }
    try {
      if (!recaptcha.current) {
        recaptcha.current = new RecaptchaVerifier(auth, 'recaptcha', { size: 'normal' });
      }
      await recaptcha.current.render();
      const result = await signInWithPhoneNumber(auth, normalizedPhone, recaptcha.current);
      setConfirmation(result);
      setMsg('OTP sent. Check SMS messages.');
    } catch (error) {
      try { await recaptcha.current?.clear(); } catch {}
      recaptcha.current = null;
      const messages = {
        'auth/operation-not-allowed': 'Phone sign-in is not enabled in Firebase Authentication.',
        'auth/invalid-phone-number': 'Invalid phone number. Use +91 followed by your 10-digit number.',
        'auth/captcha-check-failed': 'reCAPTCHA verification failed. Reload the app and try again.',
        'auth/too-many-requests': 'SMS limit reached or too many attempts. Try again later.',
        'auth/quota-exceeded': 'Firebase SMS quota exceeded. Try later or check the Firebase plan.',
        'auth/app-not-authorized': 'This app domain is not authorized in Firebase Authentication settings.',
        'auth/billing-not-enabled': 'Real SMS login needs Firebase Blaze billing and SMS may be charged. For testing without SMS, configure a fictional phone number and code in Firebase Console > Authentication > Sign-in method > Phone numbers for testing.',
      };
      setMsg(messages[error?.code] || `OTP failed (${error?.code || 'unknown'}): ${error?.message || 'Check Firebase Phone Authentication settings.'}`);
    }
  }

  async function verifyOtp(event) {
    event.preventDefault();
    try {
      await confirmation.confirm(code);
      setMsg('Signed in.');
    } catch (error) {
      setMsg(error?.message || 'Invalid OTP.');
    }
  }

  return (
    <div className="login">
      <h1 className="adminBrand"><img src={`${import.meta.env.BASE_URL}jb-star-logo.svg`} alt="JB-Star logo" />JB-STAR ADMIN</h1>
      <p>Admin Phone Login</p>
      <form onSubmit={confirmation ? verifyOtp : sendOtp}>
        {!confirmation ? (
          <>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+91 phone number"
            />
            <div id="recaptcha" />
          </>
        ) : (
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="6-digit OTP"
          />
        )}
        <button type="submit">{confirmation ? 'Verify OTP' : 'Send OTP'}</button>
      </form>
      <small>{msg}</small>
    </div>
  );
}

function Dashboard({ users, content, matches, title, setTitle, setMsg, msg }) {
  const [contentCategory, setContentCategory] = useState('featured');
  const [matchTitle, setMatchTitle] = useState('');
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [matchStatus, setMatchStatus] = useState('UPCOMING');
  const [streamUrl, setStreamUrl] = useState('');
  async function publishMatch(event) {
    event.preventDefault();
    const cleanUrl = streamUrl.trim();
    if (!matchTitle.trim() || !teamA.trim() || !teamB.trim()) { setMsg('Enter the match title and both team names.'); return; }
    if (cleanUrl && !/^https:\/\//i.test(cleanUrl)) { setMsg('Stream URL must begin with https://'); return; }
    try {
      await addDoc(collection(db, 'matches'), { title: matchTitle.trim(), teamA: teamA.trim(), teamB: teamB.trim(), status: matchStatus, streamUrl: cleanUrl, createdAt: serverTimestamp() });
      setMatchTitle(''); setTeamA(''); setTeamB(''); setStreamUrl(''); setMsg('Match published to JB-Star.');
    } catch (error) { setMsg(error?.message || 'Match publishing failed.'); }
  }
  async function publish(event) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    try {
      await addDoc(collection(db, 'content'), {
        title: cleanTitle,
        category: contentCategory,
        meta: 'Published from Admin',
        createdAt: serverTimestamp(),
      });
      setTitle('');
      setMsg('Content published to Firebase.');
    } catch (error) {
      setMsg(error?.message || 'Publish failed.');
    }
  }

  return (
    <div className="shell">
      <header>
        <b className="adminBrand"><img src={`${import.meta.env.BASE_URL}jb-star-logo.svg`} alt="JB-Star logo" />JB-STAR ADMIN</b>
        <button type="button" onClick={() => signOut(auth)}>Logout</button>
      </header>
      <main>
        <h1>Admin Dashboard</h1>
        <div className="cards">
          <div>Users<br /><strong>{users.length}</strong></div>
          <div>Content<br /><strong>{content.length}</strong></div>
          <div>Live Matches<br /><strong>{matches.length}</strong></div>
          <div>Withdrawals<br /><strong>Review</strong></div>
        </div>
        {msg && <p role="status" className="status">{msg}</p>}
        <section style={{ marginTop: 30 }}>
          <h2>Publish Live Cricket Match</h2>
          <form onSubmit={publishMatch} className="matchPublishForm">
            <input value={matchTitle} onChange={(event) => setMatchTitle(event.target.value)} placeholder="Match title (e.g. Team A vs Team B)" />
            <input value={teamA} onChange={(event) => setTeamA(event.target.value)} placeholder="Team A" />
            <input value={teamB} onChange={(event) => setTeamB(event.target.value)} placeholder="Team B" />
            <select value={matchStatus} onChange={(event) => setMatchStatus(event.target.value)}><option value="UPCOMING">Upcoming</option><option value="LIVE">Live</option><option value="COMPLETED">Completed</option></select>
            <input value={streamUrl} onChange={(event) => setStreamUrl(event.target.value)} placeholder="Authorized YouTube, LivePush player, HLS, or DASH URL (optional)" />
            <button type="submit">Publish Match</button>
          </form>
          <p>Use only a broadcast you own or are licensed to distribute. Keep stream keys and private credentials out of this field.</p>
        </section>
        <section style={{ marginTop: 30 }}>
          <h2>Published Matches</h2>
          {matches.length === 0 ? <p>No matches have been published yet.</p> : <div className="matchList">{matches.map((match) => <article key={match.id} className="matchRow"><div><strong>{match.title || 'Untitled match'}</strong><p>{match.teamA || 'Team A'} vs {match.teamB || 'Team B'} · {match.status || 'UPCOMING'}</p></div><label>Update status <select value={match.status || 'UPCOMING'} onChange={async (event) => { try { await updateDoc(doc(db, 'matches', match.id), { status: event.target.value }); setMsg('Match status updated.'); } catch (error) { setMsg(error?.message || 'Could not update match status.'); } }}><option value="UPCOMING">Upcoming</option><option value="LIVE">Live</option><option value="COMPLETED">Completed</option></select></label></article>)}</div>}
        </section>
        <section style={{ marginTop: 30 }}>
          <h2>Publish Content</h2>
          <form onSubmit={publish} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Content title"
              style={{ padding: 12, borderRadius: 10 }}
            />
            <select value={contentCategory} onChange={(event) => setContentCategory(event.target.value)} style={{ padding: 12, borderRadius: 10 }} aria-label="Content category">
              <option value="featured">Featured</option>
              <option value="movies">Movie</option>
              <option value="shows">Show</option>
            </select>
            <button type="submit">Publish</button>
          </form>
          <p>Published items are stored in Firestore and appear in the User app in real time.</p>
        </section>
      </main>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(undefined);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [msg, setMsg] = useState('');
  const [users, setUsers] = useState([]);
  const [content, setContent] = useState([]);
  const [matches, setMatches] = useState([]);
  const [title, setTitle] = useState('');

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!user) return undefined;
    const unsubscribeUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))),
    );
    const unsubscribeContent = onSnapshot(
      collection(db, 'content'),
      (snapshot) => setContent(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))),
    );
    const unsubscribeMatches = onSnapshot(
      collection(db, 'matches'),
      (snapshot) => setMatches(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))),
    );
    return () => {
      unsubscribeUsers();
      unsubscribeContent();
      unsubscribeMatches();
    };
  }, [user]);

  if (user && user.uid === ADMIN_UID) {
    return (
      <Dashboard
        users={users}
        content={content}
        matches={matches}
        title={title}
        setTitle={setTitle}
        setMsg={setMsg}
        msg={msg}
      />
    );
  }

  if (user && user.uid !== ADMIN_UID) {
    return (
      <div className="login">
        <h1 className="adminBrand"><img src={`${import.meta.env.BASE_URL}jb-star-logo.svg`} alt="JB-Star logo" />JB-STAR ADMIN</h1>
        <p>This account is not authorized for the Admin dashboard.</p>
        <button type="button" onClick={() => signOut(auth)}>Sign out</button>
      </div>
    );
  }

  return (
    <Login
      phone={phone}
      setPhone={setPhone}
      code={code}
      setCode={setCode}
      confirmation={confirmation}
      setConfirmation={setConfirmation}
      msg={msg}
      setMsg={setMsg}
    />
  );
}

createRoot(document.getElementById('root')).render(<App />);


