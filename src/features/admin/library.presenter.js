/* Presenter المكتبة العامة (الأدمن): دوال صافية. */

export const blankLibForm = () => ({ id: null, title: "", subject: "", desc: "", videoUrl: "", pdfUrl: "" });
export const libFormFrom = (it) => ({ id: it.id, title: it.title || "", subject: it.subject || "", desc: it.desc || "", videoUrl: it.videoUrl || "", pdfUrl: it.pdfUrl || "" });

/** رسالة خطأ الفورم أو null. */
export function validateLibForm(f) {
  if (!f.title.trim()) return "اكتب العنوان الأول.";
  if (!f.videoUrl.trim() && !f.pdfUrl.trim()) return "أضف لينك فيديو أو ملف PDF على الأقل.";
  return null;
}

/** مستند عنصر المكتبة للحفظ. */
export const libItemDoc = (f) => ({ title: f.title.trim(), subject: f.subject.trim(), desc: f.desc.trim(), videoUrl: f.videoUrl.trim(), pdfUrl: f.pdfUrl.trim() });
