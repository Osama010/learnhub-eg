import { fbProfile } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { esc } from "../../core/utils.js";
import { avatarModel } from "./profile.presenter.js";

/* ---------- تاب حسابي: الصورة والبروفايل ----------
   الصورة بتتصغّر في المتصفح لـ 256×256 JPEG وتتحفظ كنص في حقل avatar في مستند الطالب.
   مفيش Firebase Storage (الخطة المجانية)، ومفيش تغيير في القواعد:
   الطالب مسموح له يعدل مستنده طالما status/email/teacherIds زي ما هما. */
export function sAvatarHtml(size) {
  const { av, nm, hasPhoto } = avatarModel(fbProfile);
  if (hasPhoto) return T("student.sAvatarHtml", { av, size });
  return T("student.sAvatarHtml_2", { esc, nm, size });
}