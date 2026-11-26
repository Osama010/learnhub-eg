import { T } from "../../core/templates.js";
import { fbUser } from "../../core/session.js";
import { downloadBlob } from "../landing/landing.js";
import { adminCache } from "./shell.js";
import { showToast } from "../../shared/toast.js";
import { backupJson, backupName, backupStudentsCsv, buildAdminBackup } from "../teacher/backup.presenter.js";

/* ---------- نسخة احتياطية للأدمن (تصدير JSON / CSV من البيانات المحمّلة) ---------- */
export const adminBackupCardHtml = () => T("admin.backupCard");

export function bindAdminBackup() {
  const j = document.getElementById("abk-json"), c = document.getElementById("abk-csv");
  if (!j || !c) return;
  j.onclick = () => {
    const b = buildAdminBackup({ admin: { email: (fbUser && fbUser.email) || "" }, teachers: adminCache.teachers, students: adminCache.students, log: adminCache.log, now: new Date() });
    downloadBlob(new Blob([backupJson(b)], { type: "application/json" }), backupName(new Date(), "json"));
    showToast("اتنزلت النسخة الاحتياطية ✅");
  };
  c.onclick = () => {
    downloadBlob(new Blob([backupStudentsCsv(adminCache.students || [])], { type: "text/csv;charset=utf-8" }), backupName(new Date(), "csv"));
    showToast("اتنزل ملف الطلاب ✅");
  };
}
