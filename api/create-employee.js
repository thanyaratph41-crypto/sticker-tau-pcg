import { randomBytes } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb, normalizeUsername } from "../server/firebaseAdmin.js";

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
    const email = String(body.email || "").trim().toLowerCase();
    const employeeCode = normalizeUsername(body.employeeCode || email.split("@")[0]);
    const displayName = String(body.displayName || "").trim();
    const role = String(body.role || "Staff");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return send(res, 400, { error: "กรุณากรอกอีเมลที่ถูกต้อง" });
    if (!displayName) return send(res, 400, { error: "กรุณาระบุชื่อ-นามสกุล" });
    if (!["Admin", "Supervisor", "Staff", "Viewer"].includes(role)) return send(res, 400, { error: "ระดับสิทธิ์ไม่ถูกต้อง" });

    const duplicate = await adminAuth.getUserByEmail(email).then(() => true).catch((error) => {
      if (error.code === "auth/user-not-found") return false;
      throw error;
    });
    if (duplicate) return send(res, 409, { error: "อีเมลนี้มีบัญชีอยู่แล้ว" });

    // สร้างรหัสผ่านสุ่มที่ผู้ใช้จะไม่ต้องทราบ จากนั้นหน้าเว็บส่งลิงก์ตั้งรหัสผ่านไปยังอีเมล
    const temporaryPassword = randomBytes(36).toString("base64url") + "aA1!";
    const user = await adminAuth.createUser({ email, password: temporaryPassword, displayName, disabled: false });
    try {
      await adminDb.collection("users").doc(user.uid).set({
        uid: user.uid,
        username: employeeCode,
        employeeCode,
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

    return send(res, 201, { ok: true, uid: user.uid, email, employeeCode, displayName, role });
  } catch (error) {
    if (error.code === "auth/invalid-id-token" || error.code === "auth/id-token-expired") {
      return send(res, 401, { error: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" });
    }
    if (error.code === "auth/email-already-exists") return send(res, 409, { error: "อีเมลนี้ถูกใช้งานแล้วใน Firebase Authentication" });
    console.error("create-employee error:", error);
    return send(res, 500, { error: error.message || "สร้างบัญชีไม่สำเร็จ" });
  }
}
