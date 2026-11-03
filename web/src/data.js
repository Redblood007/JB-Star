import { collection, doc, onSnapshot, orderBy, query, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export function subscribeToContent(callback) {
  const q = query(collection(db, 'content'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export function subscribeToMatches(callback) {
  const q = query(collection(db, 'matches'), orderBy('startTime', 'asc'));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export async function upsertUser(user) {
  if (!user?.uid) return;
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    phoneNumber: user.phoneNumber || null,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
