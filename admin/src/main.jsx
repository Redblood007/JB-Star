import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, onAuthStateChanged, signInWithPhoneNumber, signOut } from 'firebase/auth';
import './styles.css';

const firebaseConfig = { apiKey:'AIzaSyBH0n2tMgpm0JeX_83MZq--YrqwYRGYrBk', authDomain:'jb-star-91242.firebaseapp.com', projectId:'jb-star-91242', storageBucket:'jb-star-91242.firebasestorage.app', messagingSenderId:'594842237736', appId:'1:594842237736:web:db98fed6d92761454ae1d' };
const auth = getAuth(initializeApp(firebaseConfig));

function App(){
  const [user,setUser]=useState(undefined), [phone,setPhone]=useState(''), [code,setCode]=useState(''), [confirmation,setConfirmation]=useState(null), [msg,setMsg]=useState('');
  const recaptcha=useRef(null);
  useEffect(()=>onAuthStateChanged(auth,setUser),[]);
  async function send(e){e.preventDefault();setMsg('');try{if(!recaptcha.current){recaptcha.current=new RecaptchaVerifier(auth,'recaptcha',{size:'normal'});await recaptcha.current.render();}const result=await signInWithPhoneNumber(auth,phone,recaptcha.current);setConfirmation(result);setMsg('OTP sent.');}catch(err){setMsg(err?.message||'OTP failed.');}}
  async function verify(e){e.preventDefault();try{await confirmation.confirm(code);setMsg('Signed in.');}catch(err){setMsg(err?.message||'Invalid OTP.');}}
  if(user)return <div className="shell"><header><b>JB★STAR ADMIN</b><button onClick={()=>signOut(auth)}>Logout</button></header><main><h1>Admin Dashboard</h1><div className="cards"><div>Users<br/><strong>Manage</strong></div><div>Content<br/><strong>Manage</strong></div><div>Live Matches<br/><strong>Manage</strong></div><div>Withdrawals<br/><strong>Review</strong></div></div></main></div>;
  return <div className="login"><h1>JB★STAR ADMIN</h1><p>Admin Phone Login</p><form onSubmit={confirmation?verify:send}>{!confirmation?<><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91 phone number"/><div id="recaptcha"/></>:<input value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="6-digit OTP"/>}<button>{confirmation?'Verify OTP':'Send OTP'}</button></form><small>{msg}</small></div>;
}
createRoot(document.getElementById('root')).render(<App/>);
