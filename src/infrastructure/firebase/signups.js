/* طلبات تسجيل المدرسين الجداد (collection: teacherSignups): بتتبعت من صفحة الهبوط من غير دخول، والأدمن بس بيقرأها ويقبلها أو يرفضها.
   رقم المستند = الإيميل بحروف صغيرة، فالإيميل الواحد مفيهوش غير طلب واحد. */
import { db } from "./db.js";
import { rows } from "./mapping.js";
export const createTeacherSignup = (id, data) => db.teacherSignups().doc(id).set(data);
export const listTeacherSignups = () => db.teacherSignups().orderBy("createdAt", "desc").get().then(rows);
export const setTeacherSignupStatus = (id, status) => db.teacherSignups().doc(id).update({ status });
