/* Presenter حساب المدرس: دوال صافية. */

/** صورة المدرس الحالية ("" لو مفيش). */
export const avatarOf = (profile) => (profile && (profile.avatar || profile.photoData)) || "";
/** اسم المدرس مقصوص. */
export const nameOf = (profile) => ((profile && profile.name) || "").trim();

/** قص مربع من المنتصف: بيرجع مصدر القص (sx, sy, min) لصورة w*h. */
export function squareCrop(w, h) { const min = Math.min(w, h); return { sx: (w - min) / 2, sy: (h - min) / 2, min }; }

/** رسالة خطأ لو الملف مش صورة، وإلا null. */
export const avatarFileError = (file) => (!file.type || !file.type.startsWith("image/")) ? "اختار ملف صورة." : null;
