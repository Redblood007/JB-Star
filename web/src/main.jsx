import React, { useEffect, useRef, useState } from 'react';
import { RecaptchaVerifier, onAuthStateChanged, signInWithPhoneNumber, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { subscribeToContent, subscribeToMatches, upsertUser } from './data';
import './styles.css';

const TEST_STREAM = 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8';

function Login({ onClose }) {
  const [phone, setPhone] = useState(''); const [code, setCode] = useState(''); const [confirmation, setConfirmation] = useState(null); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const recaptchaRef = useRef(null);
  useEffect(() => { if (!recaptchaRef.current) { recaptchaRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'normal' }); recaptchaRef.current.render().catch(() => {}); } return () => { recaptchaRef.current?.clear(); recaptchaRef.current = null; }; }, []);
  async function sendOtp(e) { e.preventDefault(); setMessage(''); if (!/^\+91\d{10}$/.test(phone)) return setMessage('Enter a valid Indian number, e.g. +919876543210'); setBusy(true); try { const result = await signInWithPhoneNumber(auth, phone, recaptchaRef.current); setConfirmation(result); setMessage('OTP sent. Check your SMS.'); } catch (error) { setMessage(error?.message || 'Could not send OTP.'); recaptchaRef.current?.clear(); recaptchaRef.current = null; } finally { setBusy(false); } }
  async function verifyOtp(e) { e.preventDefault(); if (!confirmation || !/^\d{6}$/.test(code)) return; setBusy(true); try { await confirmation.confirm(code); onClose(); } catch (error) { setMessage(error?.message || 'Invalid OTP.'); } finally { setBusy(false); } }
  return <div className="modalBackdrop"><div className="loginCard"><button className="close" onClick={onClose}>×</button><div className="logo large">JB<span>★</span>STAR</div><h2>Sign in to JB-Star</h2><p className="muted">Use your phone number to continue.</p>{!confirmation ? <form onSubmit={sendOtp}><label>Phone number</label><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 9876543210" inputMode="tel"/><div id="recaptcha-container" className="recaptcha"/><button className="primary full" disabled={busy}>{busy ? 'Sending OTP…' : 'Send OTP'}</button></form> : <form onSubmit={verifyOtp}><label>6-digit OTP</label><input value={code} onChange={e => setCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="Enter OTP" inputMode="numeric"/><button className="primary full" disabled={busy}>{busy ? 'Verifying…' : 'Verify & Continue'}</button></form>}{message && <p className="status">{message}</p>}</div></div>;
}

function LivePlayer({ streamUrl }) {
  const videoRef = useRef(null); const [error, setError] = useState('');
  useEffect(() => { const video = videoRef.current; if (!video || !streamUrl) return; setError(''); video.src = streamUrl; const onError = () => setError('This HLS stream cannot be played in this browser/device.'); video.addEventListener('error', onError); return () => { video.removeEventListener('error', onError); video.removeAttribute('src'); video.load(); }; }, [streamUrl]);
  return <section className="section"><div className="sectionHead"><h2>🔴 Live Stream</h2><span>TEST STREAM</span></div><div style={{background:'#000',borderRadius:16,overflow:'hidden'}}><video ref={videoRef} controls playsInline muted autoPlay style={{width:'100%',display:'block',minHeight:220}} /></div>{error && <p className="status">{error}</p>}<p className="muted" style={{marginTop:10}}>Development test stream. Replace this URL with your authorized production stream.</p></section>;
}

function App() {
  const [user, setUser] = useState(undefined); const [showLogin, setShowLogin] = useState(false); const [content, setContent] = useState([]); const [matches, setMatches] = useState([]);
  useEffect(() => onAuthStateChanged(auth, async (u) => { setUser(u); if (u) await upsertUser(u).catch(() => {}); }), []);
  useEffect(() => { const a = subscribeToContent(setContent); const b = subscribeToMatches(setMatches); return () => { a(); b(); }; }, []);
  const cards = matches.length ? matches : content.length ? content : [{ id:'fallback', title:'Live Cricket', meta:'Firebase content will appear here' }];
  return <div className="app"><header><div className="logo">JB<span>★</span>STAR</div><nav><a>Home</a><a>Live</a><a>Sports</a><a>Movies</a><a>Shows</a></nav>{user ? <button onClick={() => signOut(auth)}>Logout</button> : <button onClick={() => setShowLogin(true)}>Login</button>}</header><main><section className="hero"><div><p className="eyebrow">LIVE SPORTS • ENTERTAINMENT</p><h1>Watch what you love.</h1><p className="sub">Live cricket, sports and entertainment in one place.</p><button className="primary" onClick={() => document.getElementById('live-player')?.scrollIntoView({ behavior:'smooth' })}>Watch Live</button></div></section><div id="live-player"><LivePlayer streamUrl={TEST_STREAM} /></div><section className="section"><div className="sectionHead"><h2>Live & Featured</h2><span>{user ? 'Firebase connected' : 'Login to continue'}</span></div><div className="grid">{cards.map(m => <article key={m.id}><div className="poster"><span>JB★</span></div><h3>{m.title || m.name || 'Untitled'}</h3><p>{m.meta || m.status || 'Firebase data'}</p></article>)}</div></section></main>{showLogin && <Login onClose={() => setShowLogin(false)} />}</div>;
}
createRoot(document.getElementById('root')).render(<App />);
