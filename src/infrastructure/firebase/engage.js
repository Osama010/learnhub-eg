/* تتبّع الفيديو (videoWatch)، تقييمات المدرسين (teacherReviews)، ولقطات ولي الأمر (parentViews). */
import { db } from "./db.js";
import { rows } from "./mapping.js";
export const saveVideoWatch = (id, data) => db.videoWatch().doc(id).set(data, { merge: true });
export const listVideoWatch = (teacherId, lessonId) => db.videoWatch().where("teacherId", "==", teacherId).where("lessonId", "==", lessonId).limit(500).get().then(rows);
export const getTeacherReview = (id) => db.teacherReviews().doc(id).get().then((s) => (s.exists ? { id: s.id, ...s.data() } : null));
export const saveTeacherReview = (id, data) => db.teacherReviews().doc(id).set(data);
export const listApprovedReviews = (teacherId) => db.teacherReviews().where("teacherId", "==", teacherId).where("status", "==", "approved").limit(30).get().then(rows);
export const listPendingReviews = () => db.teacherReviews().where("status", "==", "pending").limit(50).get().then(rows);
export const setReviewStatus = (id, status) => db.teacherReviews().doc(id).update({ status });
export const deleteTeacherReview = (id) => db.teacherReviews().doc(id).delete();
export const getParentView = (code) => db.parentViews().doc(code).get().then((s) => (s.exists ? { id: s.id, ...s.data() } : null));
export const saveParentView = (code, data) => db.parentViews().doc(code).set(data);
export const findParentViewOf = (uid) => db.parentViews().where("studentId", "==", uid).limit(1).get().then(rows).then((r) => r[0] || null);
export const deleteParentView = (code) => db.parentViews().doc(code).delete();
export const getUserState = (uid) => db.userState().doc(uid).get().then((s) => (s.exists ? s.data() : null));
export const saveUserState = (uid, patch) => db.userState().doc(uid).set(patch, { merge: true });
export const getTeacherContact = (id) => db.teacherContact().doc(id).get().then((s) => (s.exists ? s.data() : null));
export const saveTeacherContact = (id, data) => db.teacherContact().doc(id).set(data);
