/* البورتس (Ports): العقود اللي طبقة الـ use cases بتعتمد عليها. التنفيذ الفعلي في infrastructure (Firebase للإنتاج،
   memory للاختبارات). JavaScript مفيهاش interfaces، فالعقد هنا قايمة أسماء ميثودز + assertPort بتتأكد إن أي تنفيذ مكتمل. */

import { DATA_GATEWAY } from "./data-gateway.js";

export const PORTS = {
  DataGateway: DATA_GATEWAY, // واجهة قراءة/كتابة البيانات للشاشات (main/data.js)
  /** الطلاب وفهرس التسجيل العام (ذريًا: الحالة بتتغير في المستند والفهرس مع بعض) */
  StudentRepository: [
    "register",          // (data) -> id        إنشاء طالب جديد (pending) مع createdAt
    "saveAttempt",       // (docId, data) -> void              محاولة كويز/امتحان (محاولة واحدة لكل مستند، بتستبدل القديمة)
    "changeStatus",      // (id, email|null, status) -> void   student + registration index في دفعة واحدة
    "changeGrade",       // (ids[], grade) -> void             على دفعات 400
    "removeResultsOf",   // (id) -> {attCount, rateCount}      محاولات وتقييمات الطالب
    "removeWithIndex",   // (id, email|null) -> void           مستند الطالب + فهرس تسجيله
    "detachTeacher",     // (teacherId) -> count               شيل المدرس من قوائم كل طلابه
    "get",               // (id) -> data|null                  ملف طالب
    "update",            // (id, patch) -> void                تعديل حقول في ملف الطالب
    "setSuspendedFor",   // (id, teacherId, suspend) -> void  إيقاف/رجوع الطالب عن محتوى مدرس واحد بس
    "createLinked",      // (uid, data, lookup) -> void       طالب أضافه المدرس: مستند + فهرس في دفعة واحدة
    "replaceProfile",    // (newId, data, oldId)               اكتب الملف بالـ uid الجديد وامسح القديم (ربط حساب)
  ],
  RegistrationIndexRepository: [
    "get",               // (email) -> data|null
    "create",            // (email, data) -> void
    "addTeacher",        // (email, teacherId) -> void
    "update",            // (email, patch) -> void
    "move",              // (oldEmail, newEmail, studentId, fallback) -> void  نقل الفهرس لإيميل جديد مع الحفاظ على الرقم السري
  ],
  TeacherRepository: [
    "removeContentOf",   // (teacherId) -> {collection: count}  دروس وكويزات وامتحانات وإعلانات وبنك ونوتات ونتايج
    "removeWithPublic",  // (id) -> void                        الملف الخاص + النسخة العامة
    "isEmailRegistered", // (email) -> bool                     إيميل المدرس في النسخة العامة
    "save",              // ({mode:"create"|"update", id, privateData, publicData, payment?}) -> void  ذريًا: الملف الخاص + العامة + دفعة اختيارية
  ],
  JoinRequestRepository: [
    "answer",            // ({requestId, studentId, accept, teacherId}) -> void  ذريًا: الطالب (لو قبول) + حالة الطلب
  ],
  AdminRepository: [
    "get",               // (email) -> data|null
    "create",            // (email, data) -> void
    "setPinHash",        // (email, pinHash) -> void
    "add",               // (email, name, addedBy) -> doc      مشرف جديد (بيرجّع المستند)
    "remove",            // (email) -> void
  ],
  SubjectRepository: [
    "add",               // ({name,stage,grade}) -> void       مادة عادية
    "update",            // (id, {name,stage,grade}) -> void
    "remove",            // (id) -> void
    "addCore",           // (list[]) -> void                   مواد أساسية كتير مرة واحدة
  ],
  LibraryRepository: [
    "save",              // (id|null, data, createdBy) -> void  جديد لو id فاضي
    "remove",            // (id) -> void
  ],
  SettingsRepository: [
    "setCurrentTerm",    // (term) -> void
    "publishBroadcast",  // ({text,audience,until:Date}) -> void
    "clearBroadcast",    // () -> void
    "saveSection",       // (name, data) -> void               دمج في مستند إعدادات (about/stats/footer)
  ],
  AuthGateway: [
    "createUser",        // (email, password) -> {uid, sendEmailVerification()}   بيعمل حساب Auth ويدخّله تلقائيًا
    "sendPasswordReset", // (email) -> void
    "createManagedUser", // (email) -> {uid, emailSent}   حساب بباسورد عشوائي + إيميل اختيار الباسورد، من غير تسجيل دخول
  ],
};

export class PortError extends Error {}
/** بيتأكد إن التنفيذ بيحقق كل ميثودز العقد. بيرمي PortError لو ناقص حاجة. */
export function assertPort(name, impl) {
  const missing = (PORTS[name] || []).filter((m) => typeof (impl && impl[m]) !== "function");
  if (!PORTS[name] || missing.length) throw new PortError(`${name}: missing ${missing.join(", ") || "(unknown port)"}`);
  return impl;
}
