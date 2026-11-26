import { authErrAr, fbProfile, fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { renderLogin } from "../auth/login.js";
import { closing } from "../../shared/common.js";
import { bindTeacherTabs, teacherCache, teacherLoadLessons, teacherTabs } from "./dashboard.js";
import { lessonsState } from "./lessons.js";
import { bailIfSignedOut, showToast } from "../../shared/toast.js";
import { batchUpdateTeacher } from "../../main/data.js";
import { newBatch } from "../../main/data.js";
import { sendPasswordReset } from "../../main/data.js";
import { removeField } from "../../main/data.js";
import { avatarFileError, avatarOf, nameOf, squareCrop } from "./account.presenter.js";

/* ---------- تاب حسابي (المدرس) ----------
   صورته (بتظهر لطلابه جنب اسمه)، إحصائياته، بياناته للقراءة، وتغيير الباسورد.
   الصورة بتتصغّر في المتصفح وتتحفظ في ملفه (teachers) والنسخة العامة (teachersPublic)
   عشان تظهر للطلاب — زي صورة الطالب بالظبط. */
function tMyAvatar(size) {
  const av = avatarOf(fbProfile);
  const nm = nameOf(fbProfile);
  if (av) return T("teacher.tMyAvatar", { av, size });
  return T("teacher.tMyAvatar_2", { esc, nm, size });
}

export async function renderTeacherProfile() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  app.innerHTML = T("teacher.renderTeacherProfile");
  try { await teacherLoadLessons(); }
  catch (e) { app.innerHTML = T("teacher.renderTeacherProfile_2", { e, esc }); return; }
  const t = fbProfile || {};
  const approved = (teacherCache || []).filter((s) => s.status === "approved");
  const row = (lbl, val, ltr) => T("teacher.row", { esc, lbl, ltr, val });
  app.innerHTML = T("teacher.renderTeacherProfile_3", { approved, closing, esc, fbUser, row, t, tMyAvatar, teacherExams: lessonsState.exams, teacherLessons: lessonsState.lessons, teacherQuizzes: lessonsState.quizzes, teacherTabs });
  bindTeacherTabs();
  const msg = document.getElementById("tp-msg");
  document.getElementById("tp-pick").onclick = () => document.getElementById("tp-file").click();
  document.getElementById("tp-file").onchange = (e) => tAvatarSave(e.target.files && e.target.files[0], msg);
  const del = document.getElementById("tp-del");
  if (del) del.onclick = async () => {
    if (!confirm("متأكد إنك عايز تحذف صورتك؟")) return;
    try {
      const batch = newBatch();
      batchUpdateTeacher(batch, fbUser.uid, {
        avatar: removeField(),
        photoData: removeField(),
      }, { avatar: removeField() });
      await batch.commit();
      fbProfile.avatar = null;
      fbProfile.photoData = null;
      renderTeacherProfile();
    } catch (e) { msg.className = "msg bad"; msg.textContent = "مشكلة في الحذف: " + (e.message || e); showToast("مشكلة في الحذف: " + (e.message || e), "bad"); }
  };
  document.getElementById("tp-pass").onclick = async () => {
    const m = document.getElementById("tp-pass-msg");
    try {
      await sendPasswordReset(fbUser.email);
      m.className = "msg good";
      m.textContent = "اتبعت إيميل تغيير الباسورد لـ " + fbUser.email + " ✅";
      showToast("اتبعت إيميل تغيير الباسورد لـ " + fbUser.email, "good");
    } catch (e) {
      m.className = "msg bad";
      m.textContent = authErrAr(e);
      showToast(authErrAr(e), "bad");
    }
  };
  window.scrollTo(0, 0);
}

// تصغير صورة المدرس وحفظها في ملفه وفي النسخة العامة (بتظهر لطلابه)
function tAvatarSave(file, msg) {
  if (!file) return;
  const fileErr = avatarFileError(file);
  if (fileErr) {
    msg.className = "msg bad"; msg.textContent = fileErr;
    showToast(fileErr, "bad");
    return;
  }
  msg.className = "msg"; msg.textContent = "بنصغّر الصورة ونحفظها...";
  const reader = new FileReader();
  reader.onerror = () => { msg.className = "msg bad"; msg.textContent = "مشكلة في قراءة الصورة."; };
  reader.onload = () => {
    const img = new Image();
    img.onerror = () => { msg.className = "msg bad"; msg.textContent = "الملف ده مش صورة صالحة."; };
    img.onload = async () => {
      try {
        const size = 256;
        const c = document.createElement("canvas");
        c.width = size; c.height = size;
        const ctx = c.getContext("2d");
        const { sx, sy, min } = squareCrop(img.width, img.height);
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        const dataUrl = c.toDataURL("image/jpeg", 0.82);
        const batch = newBatch();
        batchUpdateTeacher(batch, fbUser.uid, { avatar: dataUrl }, { avatar: dataUrl });
        await batch.commit();
        fbProfile.avatar = dataUrl;
        showToast("اتحفظت صورتك ✅", "good");
        renderTeacherProfile();
      } catch (e) { msg.className = "msg bad"; msg.textContent = "مشكلة في الحفظ: " + (e.message || e); showToast("مشكلة في الحفظ: " + (e.message || e), "bad"); }
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}