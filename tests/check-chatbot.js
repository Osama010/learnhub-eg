/* اختبار مساعد الأسئلة الشائعة: كل سؤال سريع لازم يتجاوب بالرد الصح، والكلام غير المفهوم يروح للدعم. */
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "../src/features/landing/chatbot.presenter.js"), "utf8").replace(/export /g, "");
const m = new Function(src + "; return { answer, norm, QUICK, FALLBACK };")();
let n = 0; const eq = (a, b, msg) => { if (a !== b) { console.error("FAIL " + msg + ": " + a + " != " + b); process.exit(1); } n++; };
const cases = [["أسجّل إزاي؟", "register"], ["هل المنصة مجانية؟", "free"], ["نسيت الباسورد", "forgot"], ["أنضم كمدرس", "teacher-join"], ["أثبّت المنصة إزاي؟", "install"],
  ["إيه هو الرقم السري؟", "pin"], ["السلام عليكم", "greet"], ["شكرا", "thanks"], ["عايز أدخل", "login"], ["ازاي ادخل كأدمن", "admin"], ["فيه اختبارات؟", "features"], ["ابني عايز يسجل", "register"], ["كلمني واتساب", "support"], ["طلبي لسه متقبلش", "approval"], ["hhhh", "fallback"], ["", "fallback"], ["عاصمة فرنسا ايه", "fallback"]];
cases.forEach(([q, id]) => eq(m.answer(q).id, id, q));
m.QUICK.forEach((q) => eq(m.answer(q).id === "fallback", false, "quick " + q));
eq(m.answer("عاصمة فرنسا ايه").actions.includes("wa"), true, "fallback offers whatsapp");
console.log("chatbot:" + n + " passed");
