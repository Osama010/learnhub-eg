/* Presenter اختيار المستلم (ولي الأمر / الطالب): دوال صافية. المدرس هو اللي بيختار، ومفيش بديل تلقائي. */
export const RECIPIENT_MODES = [{ id: "parent", label: "ولي الأمر" }, { id: "student", label: "الطالب" }];

/** وضع صالح (وإلا ولي الأمر). */
export const normMode = (m) => (m === "student" ? "student" : "parent");

/** رقم المستلم حسب الاختيار بالظبط (من غير بديل). */
export const phoneFor = (x, mode) => String((normMode(mode) === "student" ? x.phone : x.parentPhone) || "").trim();

/** رقم صالح (10 أرقام على الأقل بعد تنضيف الرموز). */
export const phoneOk = (to) => String(to || "").replace(/\D/g, "").length >= 10;
