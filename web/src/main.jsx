import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RecaptchaVerifier, onAuthStateChanged, signInWithPhoneNumber, signOut } from 'firebase/auth';
import { auth } from './firebase';
import { subscribeToContent, subscribeToMatches, upsertUser } from './data';
import './styles.css';

const DEFAULT_STREAM = ''; // Configure an authorized broadcast URL in Firebase/Admin.

function Login({ onClose }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [message, setMessage] = useState('Loading security verification…');
  const [busy, setBusy] = useState(false);
  const [recaptchaReady, setRecaptchaReady] = useState(false);
  const recaptchaRef = useRef(null);

  useEffect(() => {
    let active = true;
    async function initializeRecaptcha() {
      try {
        const container = document.getElementById('recaptcha-container');
        if (!container) throw new Error('Security verification area is missing. Close and reopen Login.');
        const verifier = new RecaptchaVerifier(auth, container, { size: 'normal' });
        recaptchaRef.current = verifier;
        await verifier.render();
        if (active) {
          setRecaptchaReady(true);
          setMessage('');
        }
      } catch (error) {
        if (active) setMessage('Security verification could not load: ' + (error?.message || error?.code || 'Unknown error'));
      }
    }
    initializeRecaptcha();
    return () => {
      active = false;
      recaptchaRef.current?.clear();
      recaptchaRef.current = null;
    };
  }, []);

  async function sendOtp(event) {
    event.preventDefault();
    setMessage('');
    const normalizedPhone = phone.replace(/[\s()-]/g, '');
    if (!/^\+91\d{10}$/.test(normalizedPhone)) {
      setMessage('Enter a valid Indian number, e.g. +919876543210');
      return;
    }
    if (!recaptchaReady || !recaptchaRef.current) {
      setMessage('Security verification is not ready. Wait for the reCAPTCHA box, then try again.');
      return;
    }
    setBusy(true);
    try {
      const result = await signInWithPhoneNumber(auth, normalizedPhone, recaptchaRef.current);
      setConfirmation(result);
      setMessage('OTP sent. Check your SMS.');
    } catch (error) {
      setMessage('Firebase ' + (error?.code || 'error') + ': ' + (error?.message || 'Could not send OTP.'));
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp(event) {
    event.preventDefault();
    if (!confirmation || !/^\d{6}$/.test(code)) return;
    setBusy(true);
    try {
      await confirmation.confirm(code);
      onClose();
    } catch (error) {
      setMessage('Firebase ' + (error?.code || 'error') + ': ' + (error?.message || 'Invalid OTP.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modalBackdrop">
      <div className="loginCard">
        <button className="close" onClick={onClose}>×</button>
        <div className="logo large brand"><img src={`${import.meta.env.BASE_URL}jb-star-logo.svg`} alt="JB-Star logo" />JB-STAR</div>
        <h2>Sign in to JB-Star</h2>
        <p className="muted">Use your phone number to continue.</p>
        {!confirmation ? (
          <form onSubmit={sendOtp}>
            <label>Phone number</label>
            <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 9876543210" inputMode="tel" />
            <div id="recaptcha-container" className="recaptcha" />
            <button className="primary full" disabled={busy || !recaptchaReady}>{busy ? 'Sending OTP…' : !recaptchaReady ? 'Loading verification…' : 'Send OTP'}</button>
          </form>
        ) : (
          <form onSubmit={verifyOtp}>
            <label>6-digit OTP</label>
            <input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Enter OTP" inputMode="numeric" />
            <button className="primary full" disabled={busy}>{busy ? 'Verifying…' : 'Verify & Continue'}</button>
          </form>
        )}
        {message && <p className="status">{message}</p>}
      </div>
    </div>
  );
}

function getYouTubeId(value = '') {
  try { const url = new URL(value); if (url.hostname.includes('youtu.be')) return url.pathname.slice(1); if (url.hostname.includes('youtube.com')) { if (url.pathname === '/watch') return url.searchParams.get('v') || ''; const parts = url.pathname.split('/').filter(Boolean); if (['live','embed','shorts'].includes(parts[0])) return parts[1] || ''; } } catch {}
  return '';
}
function LivePlayer({ streamUrl }) {
  const videoRef = useRef(null); const [error, setError] = useState(''); const youtubeId = getYouTubeId(streamUrl || '');
  useEffect(() => { const video = videoRef.current; if (!video || !streamUrl || youtubeId) return undefined; setError(''); video.src = streamUrl; const onError = () => setError('This HLS stream cannot be played in this browser/device.'); video.addEventListener('error', onError); return () => { video.removeEventListener('error', onError); video.removeAttribute('src'); video.load(); }; }, [streamUrl, youtubeId]);
  return <section className="section"><div className="sectionHead"><h2>🔴 Live Cricket</h2><span>{streamUrl ? 'LIVE PLAYER' : 'AWAITING BROADCAST'}</span></div><div className="liveFrame">{youtubeId ? <iframe title="JB-Star authorized YouTube live stream" src={'https://www.youtube-nocookie.com/embed/' + youtubeId} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /> : streamUrl ? <video ref={videoRef} controls playsInline style={{ width:'100%', display:'block', minHeight:220 }} /> : <div className="liveEmpty"><strong>JB-STAR LIVE</strong><p>No authorized broadcast is connected yet.</p><small>Add a YouTube Live watch URL or HLS playback URL through Admin.</small></div>}</div>{error && <p className="status">{error}</p>}<p className="muted" style={{ marginTop:10 }}>Only broadcasts you own or are licensed to distribute should be added.</p></section>;
}

const CRICKET_API_BASE = (import.meta.env.VITE_CRICKET_API_BASE || '').replace(/\/+$/, '');

function CricketCenter() {
  const [tab, setTab] = useState('live');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    if (!CRICKET_API_BASE) {
      setItems([]);
      setError('Cricket data service is not connected yet. Configure the secure API proxy to enable live scores.');
      return () => { active = false; };
    }
    setLoading(true);
    setError('');
    fetch(`${CRICKET_API_BASE}/${tab}`, { headers: { Accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Cricket service returned HTTP ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        if (!active) return;
        const data = payload?.data ?? payload?.matches ?? payload?.response ?? payload;
        setItems(Array.isArray(data) ? data : Array.isArray(data?.matches) ? data.matches : []);
      })
      .catch((err) => { if (active) setError(err.message || 'Could not load cricket data.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tab]);

  const value = (obj, keys, fallback = '') => {
    for (const key of keys) {
      const found = key.split('.').reduce((v, part) => v?.[part], obj);
      if (found !== undefined && found !== null && found !== '') return found;
    }
    return fallback;
  };
  return (
    <section className="section cricketCenter">
      <div className="sectionHead"><h2>🏏 Cricket Center</h2><span>JB STAR SPORTS</span></div>
      <div className="cricketTabs">
        {['live', 'recent', 'upcoming'].map((name) => <button key={name} className={tab === name ? 'primary' : 'secondary'} onClick={() => setTab(name)}>{name === 'live' ? 'Live Matches' : name === 'recent' ? 'Recent Matches' : 'Upcoming'}</button>)}
      </div>
      {loading && <p className="muted">Loading cricket data…</p>}
      {error && <p className="status">{error}</p>}
      {!loading && !error && items.length === 0 && <p className="muted">No matches returned by the cricket provider.</p>}
      <div className="grid">
        {items.map((match, index) => {
          const teamA = value(match, ['team_a.name', 'team_a.team_name', 'teamA', 'first_team.name', 'first_team.team_name'], 'Team A');
          const teamB = value(match, ['team_b.name', 'team_b.team_name', 'teamB', 'second_team.name', 'second_team.team_name'], 'Team B');
          const scoreA = value(match, ['team_a.score', 'first_team.score', 'score_a', 'scoreA']);
          const scoreB = value(match, ['team_b.score', 'second_team.score', 'score_b', 'scoreB']);
          const status = value(match, ['state', 'status', 'match_status', 'result'], 'Match details');
          const title = value(match, ['match_desc', 'match_title', 'title', 'name'], `${teamA} vs ${teamB}`);
          const venue = value(match, ['venue.name', 'venue', 'ground']);
          const date = value(match, ['start_time', 'start_date', 'date', 'match_date']);
          return <article className="matchCard" key={value(match, ['match_id', 'id'], index)}>
            <div className="poster"><span>{tab === 'live' ? '🔴 LIVE' : tab === 'upcoming' ? 'UPCOMING' : 'RESULT'}</span></div>
            <h3>{title}</h3>
            <p><strong>{teamA}</strong>{scoreA ? ` · ${scoreA}` : ''}</p>
            <p><strong>{teamB}</strong>{scoreB ? ` · ${scoreB}` : ''}</p>
            <p>{status}</p>
            {(date || venue) && <small>{[date, venue].filter(Boolean).join(' · ')}</small>}
          </article>;
        })}
      </div>
    </section>
  );
}

function App() {
  const [user, setUser] = useState(undefined);
  const [showLogin, setShowLogin] = useState(false);
  const [content, setContent] = useState([]);
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);

  useEffect(() => onAuthStateChanged(auth, async (u) => {
    setUser(u);
    if (u) await upsertUser(u).catch(() => {});
  }), []);

  useEffect(() => {
    const unsubscribeContent = subscribeToContent(setContent);
    const unsubscribeMatches = subscribeToMatches(setMatches);
    return () => {
      unsubscribeContent();
      unsubscribeMatches();
    };
  }, []);

  const cards = matches.length
    ? matches
    : content.length
      ? content
      : [{ id: 'fallback', title: 'Live Cricket', meta: 'Firebase content will appear here' }];

  return (
    <div className="app">
      <header>
        <div className="logo brand"><img className="wordmark" src={`${import.meta.env.BASE_URL}jb-star-wordmark.svg`} alt="JB STAR" /></div>
        <nav><a>Home</a><a>Live</a><a>Sports</a><a>Movies</a><a>Shows</a></nav>
        {user ? <button onClick={() => signOut(auth)}>Logout</button> : <button onClick={() => setShowLogin(true)}>Login</button>}
      </header>
      <main>
        <section className="hero">
          <div>
            <p className="eyebrow">LIVE SPORTS • ENTERTAINMENT</p>
            <h1>Watch what you love.</h1>
            <p className="sub">Live cricket, sports and entertainment in one place.</p>
            <button className="primary" onClick={() => document.getElementById('live-player')?.scrollIntoView({ behavior: 'smooth' })}>Watch Live</button>
          </div>
        </section>
        <div id="live-player"><LivePlayer streamUrl={selectedMatch?.streamUrl || DEFAULT_STREAM} /></div>\n        <CricketCenter />
        <section className="section">
          <div className="sectionHead"><h2>Live & Featured</h2><span>{user ? 'Firebase connected' : 'Login to continue'}</span></div>
          <div className="grid">
            {cards.map((match) => (
              <article key={match.id} className="matchCard">
                <div className="poster"><span>{match.status === 'LIVE' ? '🔴 LIVE' : 'JB★'}</span></div>
                <h3>{match.title || match.name || 'Untitled'}</h3>
                <p>{match.teamA && match.teamB ? match.teamA + ' vs ' + match.teamB : (match.meta || match.status || 'Match details coming soon')}</p>
                {match.streamUrl && <button className="secondary" onClick={() => { setSelectedMatch(match); document.getElementById('live-player')?.scrollIntoView({ behavior: 'smooth' }); }}>Watch match</button>}
              </article>
            ))}
          </div>
        </section>
      </main>
      {showLogin && <Login onClose={() => setShowLogin(false)} />}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
