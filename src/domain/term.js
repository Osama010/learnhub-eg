/* طبقة الدومين (entities + business rules): دوال وثوابت صافية من غير DOM ولا Firebase ولا حالة عامة.
   الطبقة دي ماتستوردش أي حاجة من برّه domain/. */

export function termOf(item) { return item && item.term === 2 ? 2 : 1; }

export function termName(t) { return t === 2 ? "الترم الثاني" : "الترم الأول"; }

/* قواعد الترم (الترم الحالي بيحدده الأدمن، والمحتوى القديم من غير term بيعتبر ترم أول). */
export function currentTermOf(settings) { return settings && settings.currentTerm === 2 ? 2 : 1; }
export function isTermWritable(item, currentTerm) { return (item && item.term === 2 ? 2 : 1) === currentTerm; }
