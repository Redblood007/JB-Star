import { collection, doc, onSnapshot, orderBy, query, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export function subscribeToContent(callback) {
  const q = query(collection(db, 'content'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export function subscribeToMatches(callback) {
  // Do not order by startTime: Admin-created match documents may not have that field.
  // Firestore orderBy would silently omit those documents from the User app.
  return onSnapshot(collection(db, 'matches'), (snap) => {
    const matches = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    matches.sort((a, b) => {
      const aTime = a.startTime?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.startTime?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
      return aTime - bTime;
    });
    callback(matches);
  });
}

export async function upsertUser(user) {
  if (!user?.uid) return;
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    phoneNumber: user.phoneNumber || null,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
