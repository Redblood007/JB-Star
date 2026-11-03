import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RecaptchaVerifier, onAuthStateChanged, signInWithPhoneNumber, signOut } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import './styles.css';

const config={apiKey:'AIzaSyBH0n2tMgpm0JeX_83MZq--YrqwYRGYrBk',authDomain:'jb-star-91242.firebaseapp.com',projectId:'jb-star-91242',storageBucket:'jb-star-91242.firebasestorage.app',messagingSenderId:'594842237736',appId:'1:594842237736:web:db98fed6d92761454ae1d'};
const auth=(()=>{const app=initializeApp(config);return (awaitable=>awaitable)(app),import('firebase/auth')})

function App(){
  const [user,setUser]=useState(undefined); const [phone,setPhone]=useState(''); const [code,setCode]=useState(''); const [confirmation,setConfirmation]=useState(null); const [msg,setMsg]=useState(''); const recaptcha=useRef(null);
  useEffect(()=>{let unsub=()=>{}; import('firebase/auth').then(({getAuth,onAuthStateChanged:listen})=>{const a=getAuth(); unsub=listen(a,setUser)}); return ()=>unsub()},[]);
  async function send(e){e.preventDefault();setMsg(''); try{const {getAuth,RecaptchaVerifier,signInWithPhoneNumber}=await import('firebase/auth');const a=getAuth(); if(!recaptcha.current){recaptcha.current=new RecaptchaVerifier(a,'recaptcha',{size:'normal'});await recaptcha.current.render()} const c=await signInWithPhoneNumber(a,phone,recaptcha.current);setConfirmation(c);setMsg('OTP sent.')}catch(err){setMsg(err.message||'OTP failed')}}
  async function verify(e){e.preventDefault();try{await confirmation.confirm(code);setMsg('Signed in.')}catch(err){setMsg(err.message||'Invalid OTP')}}
  if(user)return <div className="shell"><header><b>JB★STAR ADMIN</b><button onClick={()=>signOut(user.auth)}>Logout</button></header><main><h1>Admin Dashboard</h1><div className="cards"><div>Users<br/><strong>Manage</strong></div><div>Content<br/><strong>Manage</strong></div><div>Live Matches<br/><strong>Manage</strong></div><div>Withdrawals<br/><strong>Review</strong></div></div></main></div>;
  return <div className="login"><h1>JB★STAR ADMIN</h1><p>Admin Phone Login</p><form onSubmit={confirmation?verify:send}>{!confirmation?<><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91 phone number"/><div id="recaptcha"/></>:<input value={code} onChange={e=>setCode(e.target.value)} placeholder="6-digit OTP"/>}<button>{confirmation?'Verify OTP':'Send OTP'}</button></form><small>{msg}</small></div>
}
createRoot(document.getElementById('root')).render(<App/>);
