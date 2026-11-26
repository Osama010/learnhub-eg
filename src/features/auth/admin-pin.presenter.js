/* Presenter بوابة الرقم السري للمشرف: قواعد صافية للتحقق وعدّاد المحاولات الغلط. */
export const ADMIN_MAX_PIN_FAILS = 5;

export function validateNewAdminPin(p1, p2) {
  if (!/^[0-9]{4,6}$/.test(p1)) return "الرقم السري من 4 لـ 6 أرقام.";
  if (p1 !== p2) return "الرقمين مش زي بعض.";
  return null;
}

/** بعد محاولة غلط: بيرجّع {fails, lockout, message}. */
export function pinFailure(prevFails) {
  const fails = prevFails + 1;
  return { fails, lockout: fails >= ADMIN_MAX_PIN_FAILS, message: "الرقم السري غلط. (محاولة " + fails + " من " + ADMIN_MAX_PIN_FAILS + ")" };
}
