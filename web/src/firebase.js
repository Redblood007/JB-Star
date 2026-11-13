import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

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
export const auth = getAuth(app);
export const db = getFirestore(app);

export const analyticsPromise = isSupported().then((supported) =>
  supported ? getAnalytics(app) : null,
);

export default app;
