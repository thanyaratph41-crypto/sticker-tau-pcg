import { FieldValue } from "firebase-admin/firestore";
import {
  adminAuth,
  adminDb,
  normalizeUsername,
  usernameToEmail,
} from "../server/firebaseAdmin.js";

function send(res, status, payload) {
  return res.status(status).json(payload);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "Method not allowed" });
  }

  try {
    const authHeader = String(req.headers.authorization || "");
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) return send(res, 401, { error: "กรุณาเข้าสู่ระบบใหม่" });

    const decoded = await adminAuth.verifyIdToken(match[1]);
    const requester = await adminDb.collection("users").doc(decoded.uid).get();
    if (!requester.exists || requester.get("role") !== "Admin" || requester.get("disabled") === true) {
      return send(res, 403, { error: "เฉพาะ Admin ที่มีสิทธิ์เท่านั้น" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const username = normalizeUsername(body.username);
    const displayName = String(body.displayName || "").trim();
    const password = String(body.password || "");
    const role = String(body.role || "Staff");

    if (!/^[A-Z0-9._-]{3,32}$/.test(username)) {
      return send(res, 400, { error: "Username ต้องมี 3–32 ตัว และใช้ได้เฉพาะ A-Z, 0-9, จุด, _ หรือ -" });
    }
    if (!displayName) return send(res, 400, { error: "กรุณาระบุชื่อ-นามสกุล" });
    if (password.length < 8) return send(res, 400, { error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" });
    if (!["Admin", "Supervisor", "Staff", "Viewer"].includes(role)) {
      return send(res, 400, { error: "ระดับสิทธิ์ไม่ถูกต้อง" });
    }

    const duplicate = await adminDb.collection("users")
      .where("username", "==", username)
      .limit(1)
      .get();
    if (!duplicate.empty) return send(res, 409, { error: "Username นี้มีอยู่แล้ว" });

    const email = usernameToEmail(username);
    const user = await adminAuth.createUser({ email, password, displayName, disabled: false });
    try {
      await adminDb.collection("users").doc(user.uid).set({
        uid: user.uid,
        username,
        displayName,
        role,
        disabled: false,
        email,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: decoded.uid,
      });
    } catch (error) {
      await adminAuth.deleteUser(user.uid).catch(() => {});
      throw error;
    }

    return send(res, 201, { ok: true, uid: user.uid, username, displayName, role });
  } catch (error) {
    if (error.code === "auth/invalid-id-token" || error.code === "auth/id-token-expired") {
      return send(res, 401, { error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" });
    }
    if (error.code === "auth/email-already-exists") {
      return send(res, 409, { error: "Username นี้ถูกใช้งานแล้วใน Firebase Authentication" });
    }
    console.error("create-employee error:", error);
    return send(res, 500, { error: error.message || "สร้างบัญชีไม่สำเร็จ" });
  }
}
