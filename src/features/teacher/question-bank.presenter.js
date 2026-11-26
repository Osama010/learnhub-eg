/* Presenter بنك الأسئلة: دوال صافية. */
import { qSerialize } from "../../domain/quiz.js";

export const TYPE_LABELS = { mcq: "اختيارات", multi: "اختيار متعدد", tf: "صح/خطأ", text: "إجابة قصيرة", fill: "أكمل", match: "توصيل", num: "رقمية" };

/** مستند سؤال البنك. */
export const bankItemDoc = ({ uid, profile, q, createdAt }) => ({ teacherId: uid, subject: (profile && profile.subject) || "", q: qSerialize(q), useCount: 0, createdAt });

/** الأحدث الأول (بيسيب الترتيب لو createdAt ناقص). */
export const bankNewestFirst = (bank) => bank.slice().sort((a, b) => (b.createdAt && a.createdAt ? b.createdAt.seconds - a.createdAt.seconds : 0));

/** هل نص الصف يطابق البحث (فاضي = الكل)؟ */
export const bankRowMatches = (text, term) => !term || text.includes(term);
