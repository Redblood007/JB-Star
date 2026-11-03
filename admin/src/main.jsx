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
  serverTimestamp,
} from 'firebase/firestore';
import './styles.css';

const firebaseConfig = {
  apiKey: 'AIzaSyBH0n2tMgpm0JeX_83MZq--YrqwYRGYrBk',
  authDomain: 'jb-star-91242.firebaseapp.com',
  projectId: 'jb-star-91242',
  storageBucket: 'jb-star-91242.firebasestorage.app',
  messagingSenderId: '594842237736',
  appId: '1:594842237736:web:db98fed6d92761454ae1d',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function Login({ phone, setPhone, code, setCode, confirmation, setConfirmation, msg, setMsg }) {
  const recaptcha = useRef(null);

  async function sendOtp(event) {
    event.preventDefault();
    setMsg('');
    try {
      if (!recaptcha.current) {
        recaptcha.current = new RecaptchaVerifier(auth, 'recaptcha', { size: 'normal' });
      }
      await recaptcha.current.render();
      const result = await signInWithPhoneNumber(auth, phone, recaptcha.current);
      setConfirmation(result);
      setMsg('OTP sent.');
    } catch (error) {
      setMsg(error?.message || 'OTP failed.');
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
      <h1>JB★STAR ADMIN</h1>
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

function Dashboard({ users, content, title, setTitle, setMsg }) {
  async function publish(event) {
    event.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) return;
    try {
      await addDoc(collection(db, 'content'), {
        title: cleanTitle,
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
        <b>JB★STAR ADMIN</b>
        <button type="button" onClick={() => signOut(auth)}>Logout</button>
      </header>
      <main>
        <h1>Admin Dashboard</h1>
        <div className="cards">
          <div>Users<br /><strong>{users.length}</strong></div>
          <div>Content<br /><strong>{content.length}</strong></div>
          <div>Live Matches<br /><strong>Firebase</strong></div>
          <div>Withdrawals<br /><strong>Review</strong></div>
        </div>
        <section style={{ marginTop: 30 }}>
          <h2>Publish Content</h2>
          <form onSubmit={publish} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Content title"
              style={{ padding: 12, borderRadius: 10 }}
            />
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
    return () => {
      unsubscribeUsers();
      unsubscribeContent();
    };
  }, [user]);

  if (user) {
    return (
      <Dashboard
        users={users}
        content={content}
        title={title}
        setTitle={setTitle}
        setMsg={setMsg}
      />
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
