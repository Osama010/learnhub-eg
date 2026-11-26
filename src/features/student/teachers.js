import { fbProfile, fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { renderLogin } from "../auth/login.js";
import { closing } from "../../shared/common.js";
import { sLevelCardHtml } from "./levels.js";
import { sAvatarHtml } from "./profile.js";
import { bindStudentTabs, studentData, studentLoadAll, studentTabs } from "./shell.js";
import { bailIfSignedOut } from "../../shared/toast.js";
import { listActiveTeachersPublic } from "../../main/data.js";
import { listRequestsOfStudent, createTeacherRequest, deleteTeacherRequest } from "../../main/data.js";
import { updateStudent } from "../../main/data.js";
import { changeMyPassword } from "../../main/data.js";
import { stageOfGrade } from "../../domain/student.js";
import { serverNow, removeField } from "../../main/data.js";
import { newTeacherRequest, profileStats, teachersCardModel } from "./teachers.presenter.js";

/* ---------- مدرسيني + طلب إضافة مدرس (المدرس هو اللي بيوافق) ---------- */
async function studentLoadTeacherReqs() {
  let pubs = [], reqs = [];
  try {
    const snap = await listActiveTeachersPublic();
    pubs = snap;
  } catch (_) {}
  try {
    const rs = await listRequestsOfStudent(fbUser.uid);
    reqs = rs;
  } catch (_) {}
  return { pubs, reqs };
}
function studentTeachersCardHtml(tr) {
  const mine = ((fbProfile && fbProfile.teacherIds) || []);
  const grade = (fbProfile && fbProfile.grade) || "";
  const st = typeof stageOfGrade === "function" ? stageOfGrade(grade) : "";
  const { mineList, others, reqOf } = teachersCardModel({ pubs: tr.pubs, reqs: tr.reqs, mine, stage: st });
  const row = (t) => {
    const r = reqOf(t.id);
    let act;
    if (!r) act = T("student.row", { esc, t });
    else if (r.status === "pending") act = T("student.row_2", { esc, r });
    else act = T("student.row_3", { esc, r });
    return T("student.row_4", { act, esc, t });
  };
  return T("student.studentTeachersCardHtml", { esc, mineList, others, row });
}
function bindStudentTeachers() {
  const msg = document.getElementById("sp-t-msg");
  const say = (t, ok) => { if (msg) { msg.className = "msg " + (ok ? "good" : "bad"); msg.textContent = t; } };
  document.querySelectorAll("[data-treq]").forEach((b) => b.onclick = async () => {
    const tid = b.dataset.treq;
    b.disabled = true;
    try {
      await createTeacherRequest(fbUser.uid, tid, newTeacherRequest({ studentId: fbUser.uid, teacherId: tid, name: fbProfile && fbProfile.name, grade: fbProfile && fbProfile.grade, email: fbUser.email, now: serverNow() }));
      renderStudentProfile();
    } catch (e) { b.disabled = false; say("مشكلة في إرسال الطلب: " + (e.message || e)); }
  });
  document.querySelectorAll("[data-tcancel]").forEach((b) => b.onclick = async () => {
    b.disabled = true;
    try { await deleteTeacherRequest(b.dataset.tcancel); renderStudentProfile(); }
    catch (e) { b.disabled = false; say("مشكلة: " + (e.message || e)); }
  });
}

export async function renderStudentProfile() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  if (!fbUser) return renderLogin();
  app.innerHTML = T("student.renderStudentProfile");
  try { await studentLoadAll(); }
  catch (e) { app.innerHTML = T("student.renderStudentProfile_2", { e, esc }); return; }
  const trq = await studentLoadTeacherReqs();
  const s = fbProfile || {};
  const atts = studentData.attempts || [];
  const { avg, best } = profileStats(atts);
  const row = (lbl, val, ltr) => T("student.row_5", { esc, lbl, ltr, val });
  app.innerHTML = T("student.renderStudentProfile_3", { atts, avg, best, closing, esc, fbUser, row, s, sAvatarHtml, sLevelCardHtml, studentTabs, studentTeachersCardHtml, trq });
  bindStudentTabs();
  bindStudentTeachers();
  const msg = document.getElementById("sp-msg");
  document.getElementById("sp-pick").onclick = () => document.getElementById("sp-file").click();
  document.getElementById("sp-file").onchange = (e) => sAvatarSave(e.target.files && e.target.files[0], msg);
  const del = document.getElementById("sp-del");
  if (del) del.onclick = async () => {
    if (!confirm("متأكد إنك عايز تحذف صورتك؟")) return;
    try {
      await updateStudent(fbUser.uid, { avatar: removeField() });
      fbProfile.avatar = null;
      renderStudentProfile();
    } catch (e) { msg.className = "msg bad"; msg.textContent = "مشكلة في الحذف: " + (e.message || e); }
  };
  document.getElementById("sp-pass-open").onclick = () => {
    document.getElementById("sp-pass-form").style.display = "block";
    document.getElementById("sp-pass-open-row").style.display = "none";
  };
  document.getElementById("sp-pass-save").onclick = () => sChangePass();
  window.scrollTo(0, 0);
}

// تصغير الصورة في المتصفح وحفظها كنص في مستند الطالب
function sAvatarSave(file, msg) {
  if (!file) return;
  if (!file.type || !file.type.startsWith("image/")) {
    msg.className = "msg bad"; msg.textContent = "اختار ملف صورة.";
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
        const min = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
        const dataUrl = c.toDataURL("image/jpeg", 0.82);
        await updateStudent(fbUser.uid, { avatar: dataUrl });
        fbProfile.avatar = dataUrl;
        renderStudentProfile();
      } catch (e) { msg.className = "msg bad"; msg.textContent = "مشكلة في الحفظ: " + (e.message || e); }
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

async function sChangePass() {
  const m = document.getElementById("sp-pass-msg");
  const p1 = document.getElementById("sp-p1").value;
  const p2 = document.getElementById("sp-p2").value;
  if (p1.length < 6) { m.className = "msg bad"; m.textContent = "الباسورد لازم يكون ٦ حروف على الأقل."; return; }
  if (p1 !== p2) { m.className = "msg bad"; m.textContent = "الباسوردين مش متطابقين."; return; }
  m.className = "msg"; m.textContent = "بنحفظ...";
  try {
    await changeMyPassword(p1);
    m.className = "msg good"; m.textContent = "تمام، الباسورد اتغير ✅";
  } catch (e) {
    m.className = "msg bad";
    m.textContent = (e && e.code === "auth/requires-recent-login")
      ? "لازم تسجل دخول من جديد الأول عشان تغير الباسورد. اخرج وادخل تاني وجرب."
      : "مشكلة: " + (e.message || e);
  }
}