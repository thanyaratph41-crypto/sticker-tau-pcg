import { timingSafeEqual } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import {
  adminAuth,
  adminDb,
  normalizeUsername,
  usernameToEmail,
} from "../server/firebaseAdmin.js";

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && timingSafeEqual(left, right);
}

function send(res, status, payload) {
  return res.status(status).json(payload);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const username = normalizeUsername(body.username);
    const displayName = String(body.displayName || "").trim();
    const password = String(body.password || "");
    const secret = String(body.secret || "");
    const expectedSecret = process.env.BOOTSTRAP_ADMIN_SECRET;

    if (!expectedSecret) {
      return send(res, 500, { error: "ยังไม่ได้ตั้งค่า BOOTSTRAP_ADMIN_SECRET ใน Vercel" });
    }
    if (!safeEqual(secret, expectedSecret)) {
      return send(res, 403, { error: "รหัสเปิดใช้งานครั้งแรกไม่ถูกต้อง" });
    }
    if (!/^[A-Z0-9._-]{3,32}$/.test(username)) {
      return send(res, 400, { error: "Username ต้องมี 3–32 ตัว และใช้ได้เฉพาะ A-Z, 0-9, จุด, _ หรือ -" });
    }
    if (!displayName) {
      return send(res, 400, { error: "กรุณาระบุชื่อ-นามสกุล" });
    }
    if (password.length < 10) {
      return send(res, 400, { error: "รหัสผ่านต้องมีอย่างน้อย 10 ตัวอักษร" });
    }

    const setupRef = adminDb.collection("system").doc("adminBootstrap");
    const existingAdmins = await adminDb.collection("users")
      .where("role", "==", "Admin")
      .limit(1)
      .get();

    if (!existingAdmins.empty) {
      return send(res, 409, { error: "มีบัญชี Admin อยู่แล้ว ไม่สามารถตั้งค่า Admin คนแรกซ้ำได้" });
    }

    await adminDb.runTransaction(async (tx) => {
      const setupSnap = await tx.get(setupRef);
      if (setupSnap.exists && ["creating", "completed"].includes(setupSnap.get("status"))) {
        throw new Error("BOOTSTRAP_ALREADY_USED");
      }
      tx.set(setupRef, {
        status: "creating",
        username,
        startedAt: FieldValue.serverTimestamp(),
      });
    });

    let createdUser = null;
    try {
      const email = usernameToEmail(username);
      createdUser = await adminAuth.createUser({
        email,
        password,
        displayName,
        disabled: false,
      });

      await adminDb.collection("users").doc(createdUser.uid).set({
        uid: createdUser.uid,
        username,
        displayName,
        role: "Admin",
        disabled: false,
        email,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      await setupRef.set({
        status: "completed",
        username,
        uid: createdUser.uid,
        completedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      return send(res, 201, {
        ok: true,
        uid: createdUser.uid,
        username,
      });
    } catch (error) {
      if (createdUser?.uid) {
        await adminAuth.deleteUser(createdUser.uid).catch(() => {});
        await adminDb.collection("users").doc(createdUser.uid).delete().catch(() => {});
      }
      await setupRef.delete().catch(() => {});
      throw error;
    }
  } catch (error) {
    if (error.message === "BOOTSTRAP_ALREADY_USED") {
      return send(res, 409, { error: "มีการเริ่มตั้งค่า Admin แล้ว หรือมี Admin อยู่แล้ว" });
    }
    if (error.code === "auth/email-already-exists") {
      return send(res, 409, { error: "Username นี้ถูกใช้งานแล้วใน Firebase Authentication" });
    }
    console.error("bootstrap-admin error:", error);
    return send(res, 500, { error: error.message || "สร้าง Admin ไม่สำเร็จ" });
  }
}
