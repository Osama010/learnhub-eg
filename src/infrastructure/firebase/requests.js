/* طلبات الطالب لإضافة مدرس (collection: teacherRequests) */
import { db } from "./db.js";
import { rows } from "./mapping.js";
export const listPendingRequestsOfTeacher = (teacherId) => db.teacherRequests().where("teacherId", "==", teacherId).where("status", "==", "pending").get().then(rows);
export const listRequestsOfStudent = (studentId) => db.teacherRequests().where("studentId", "==", studentId).get().then(rows);
export const createTeacherRequest = (studentId, teacherId, data) => db.teacherRequests().doc(studentId + "_" + teacherId).set(data);
export const deleteTeacherRequest = (id) => db.teacherRequests().doc(id).delete();
export const batchSetRequestStatus = (batch, id, status) => batch.update(db.teacherRequests().doc(id), { status });
