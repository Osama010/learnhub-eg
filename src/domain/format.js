/* طبقة الدومين (entities + business rules): دوال وثوابت صافية من غير DOM ولا Firebase ولا حالة عامة.
   الطبقة دي ماتستوردش أي حاجة من برّه domain/. */

/* دوال مشتركة (كانت في admin.js) */
export function fmtTs(ts) {
  try { return ts && ts.toDate ? ts.toDate().toLocaleString("ar-EG") : "—"; } catch (e) { return "—"; }
}

export function tsToDate(ts) {
  try { return ts && ts.toDate ? ts.toDate() : null; } catch (e) { return null; }
}
