/* دفعات الكتابة الذرية (Firestore batch). الواجهات بتفتح الدفعة من هنا وبتبعتها لدوال الخدمات. */
import { db } from "./db.js";
export const newBatch = () => db.batch();
