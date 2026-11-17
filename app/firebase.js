import { initializeApp, getApps, getApp } from "firebase/app";

import {
  getAuth
} from "firebase/auth";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDSfINgt1hU4ZmyMEpUnIvXc3rbhpLTqas",
  authDomain: "raw-materials-961ad.firebaseapp.com",
  projectId: "raw-materials-961ad",
  storageBucket: "raw-materials-961ad.firebasestorage.app",
  messagingSenderId: "140233654453",
  appId: "1:140233654453:web:b2941fde772cfbae7abefc",
  measurementId: "G-3HGCS68WEB"
};

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const firestore = getFirestore(app);

// บันทึกประวัติการใช้งาน
export async function writeAudit(
  userProfile,
  action,
  entityType,
  entityId,
  details = {}
) {
  return await addDoc(collection(firestore, "auditLogs"), {
    actorUid: userProfile?.uid || "",
    actorName: userProfile?.displayName || "",
    actorUsername: userProfile?.username || "",
    actorRole: userProfile?.role || "",
    action,
    entityType,
    entityId: String(entityId || ""),
    details,
    clientTime: new Date().toISOString(),
    createdAt: serverTimestamp()
  });
}

// ดึงรายชื่อผู้ใช้งาน
export async function listUsers() {
  const snapshot = await getDocs(
    collection(firestore, "users")
  );

  return snapshot.docs.map((doc) => ({
    uid: doc.id,
    ...doc.data()
  }));
}

// ดึงประวัติ Audit Log ล่าสุด 250 รายการ
export async function listAuditLogs() {
  const q = query(
    collection(firestore, "auditLogs"),
    orderBy("createdAt", "desc"),
    limit(250)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  }));
}
