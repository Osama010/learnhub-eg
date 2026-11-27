/* مصادقة Firebase Auth */
import { fbAuth, openFirebaseClient } from "./client.js";
/** فتح الجلسة (تهيئة Firebase) والاشتراك في تغيّر حالة الدخول: دول اللي بتعتمد عليهم core/session من غير ما تعرف Firebase. */
export const openSession = (config) => openFirebaseClient(config);
export const onAuthChange = (cb) => fbAuth.onAuthStateChanged(cb);
export const sendPasswordReset = (email) => fbAuth.sendPasswordResetEmail(email);
export const signInWithPassword = (email, pass) => fbAuth.signInWithEmailAndPassword(email, pass);
export const signInWithGoogle = (provider) => fbAuth.signInWithPopup(provider);
export const createAuthUser = (email, pass) => fbAuth.createUserWithEmailAndPassword(email, pass);
export const signOutUser = () => fbAuth.signOut();
export const changeMyPassword = (p) => fbAuth.currentUser.updatePassword(p);
export const currentAuthUser = () => fbAuth.currentUser;
/** مزوّد دخول جوجل (بيفتح قائمة اختيار الحساب في كل مرة حتى لو فيه حساب محفوظ على الجهاز). */
export function newGoogleProvider() {
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}
/** إنشاء حساب Auth لمدرس من غير ما الأدمن الحالي يتسجّل خروجه: تطبيق ثانوي مؤقت بيتقفل بعد الإنشاء.
    لينك التفعيل بيتبعت فوراً؛ لو فشل مش بنوقف الإضافة (المدرس يطلب لينك تاني من بوابة التفعيل). بيرجّع uid. */
/** حساب Auth لطالب يضيفه المدرس: باسورد عشوائي محدش بيشوفه، وفورًا إيميل Firebase "اختار باسوردك".
    تطبيق ثانوي مؤقت عشان المدرس ميتسجلش خروجه. بيرجّع {uid, emailSent}: فشل الإرسال لوحده مش بيلغي الحساب (الطالب يطلب إعادة الإرسال). */
export async function createManagedAuthUser(email) {
  let secondary = null;
  try {
    secondary = firebase.initializeApp(FIREBASE_CONFIG, "tmgr" + Date.now() + "_" + Math.floor(Math.random() * 1e6));
    const sa = secondary.auth();
    const bytes = new Uint8Array(24); crypto.getRandomValues(bytes);
    const pass = Array.from(bytes, (b) => "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 56]).join("") + "9aA";
    const cred = await sa.createUserWithEmailAndPassword(email, pass);
    let emailSent = true;
    try { await sa.sendPasswordResetEmail(email); } catch (_) { emailSent = false; }
    await sa.signOut();
    return { uid: cred.user.uid, emailSent };
  } finally {
    if (secondary) try { await secondary.delete(); } catch (_) {}
  }
}
export async function createAuthUserSecondary(email, pass) {
  let secondary = null;
  try {
    secondary = firebase.initializeApp(FIREBASE_CONFIG, "tadmin" + Date.now());
    const cred = await secondary.auth().createUserWithEmailAndPassword(email, pass);
    try { await cred.user.sendEmailVerification(); } catch (_) {}
    await secondary.auth().signOut();
    return cred.user.uid;
  } finally {
    if (secondary) try { await secondary.delete(); } catch (_) {}
  }
}
