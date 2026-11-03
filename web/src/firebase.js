import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: 'AIzaSyBH0n2tMgpm0JeX_83MZq--YrqwYRGYrBk',
  authDomain: 'jb-star-91242.firebaseapp.com',
  projectId: 'jb-star-91242',
  storageBucket: 'jb-star-91242.firebasestorage.app',
  messagingSenderId: '594842237736',
  appId: '1:594842237736:web:db98fed6d92761454ae1d',
  measurementId: 'G-T5D7V1DWQ8',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export const analyticsPromise = isSupported().then((supported) =>
  supported ? getAnalytics(app) : null,
);

export default app;
