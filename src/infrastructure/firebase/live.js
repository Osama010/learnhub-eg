/* الحصص المباشرة (collection: liveClasses) وصفحة المدرس العامة (teachersPublic). */
import { db } from "./db.js";
import { rows } from "./mapping.js";
export const listLiveOfTeacher = (teacherId) => db.liveClasses().where("teacherId", "==", teacherId).get().then(rows);
export const addLiveClass = (data) => db.liveClasses().add({ ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
export const deleteLiveClass = (id) => db.liveClasses().doc(id).delete();
export const getTeacherPublic = (id) => db.teachersPublic().doc(id).get().then((s) => (s.exists ? { id: s.id, ...s.data() } : null));
