/* تأكيد الإيميل: مين محتاج يفعّل، وكام ثانية فاضلة على إعادة الإرسال. */
export function verifyRequired({ user, role, profile }) {
  return !!(user && (role === "student" || role === "teacher") && profile && profile.emailVerifyRequired && !user.emailVerified);
}
export function cooldownSecondsLeft(untilMs, nowMs) { return Math.max(0, Math.ceil((untilMs - nowMs) / 1000)); }
