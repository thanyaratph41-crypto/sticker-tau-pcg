import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function readServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error("ยังไม่ได้ตั้งค่า FIREBASE_SERVICE_ACCOUNT_JSON ใน Vercel");
  }

  let parsed;
  try {
    // รองรับทั้ง JSON ปกติและ Base64 ของ JSON
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    }
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON ไม่ใช่ JSON หรือ Base64 ที่ถูกต้อง");
  }

  if (parsed.private_key) {
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  }
  return parsed;
}

const serviceAccount = readServiceAccount();

const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID,
      });

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);

export function usernameToEmail(username) {
  return `${String(username).trim().toLowerCase()}@sticker-tau-pcg.local`;
}

export function normalizeUsername(value) {
  return String(value || "").trim().toUpperCase();
}
