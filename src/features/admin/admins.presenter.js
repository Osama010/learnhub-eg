/* Presenter المشرفين ورقمهم السري: دوال صافية. */

/** تحقق بيانات مشرف جديد: {error} أو {name, email}. */
export function validateAdminInput(nameRaw, emailRaw) {
  const name = nameRaw.trim(), email = emailRaw.trim().toLowerCase();
  if (!name || !email || !email.includes("@")) return { error: "اكتب اسم المشرف وإيميله صح." };
  return { name, email };
}

/** تحقق تغيير الرقم السري: رسالة الخطأ أو null. */
export function validateAdminPinChange(p1, p2) {
  if (!/^[0-9]{4,6}$/.test(p1)) return "الرقم السري من 4 لـ 6 أرقام.";
  if (p1 !== p2) return "الرقمين مش زي بعض.";
  return null;
}
