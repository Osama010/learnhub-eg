import { fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { esc } from "../../core/utils.js";
import { aboutGet } from "../about/about.js";
import { aboutState } from "../../shared/about-state.js";
import { adminCache, adminLayout, adminLogAction } from "./shell.js";
import { loadStatsSettings, set_statsCfg, statsCfg, statsGet } from "../landing/stats.js";
import { bailIfSignedOut, showToast } from "../../shared/toast.js";
import { useCases } from "../../main/compose.js";
import { serverNow } from "../../main/data.js";
import { buildAboutDoc, parseStatsInputs, validateFooterText } from "./account.presenter.js";
import { validateAdminPinChange } from "./admins.presenter.js";

/* ---------- تاب حسابي (الأدمن) ----------
   بيانات المشرف + تغيير الباسورد + تغيير رقم الأدمن السري من مكان واحد */
export function adminProfile() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  const myEmail = ((fbUser && fbUser.email) || "").toLowerCase();
  const me = (adminCache.admins || []).find((a) => a.id === myEmail) || {};
  const isSuper = myEmail === ADMIN_EMAIL;
  const hasPasswordProvider = (fbUser && fbUser.providerData || []).some((p) => p.providerId === "password");
  const content = T("admin.adminProfile", { aboutGet, esc, footerText: aboutState.footerText, isSuper, me, myEmail, statsGet });
  adminLayout(content, "profile");

  /* --- فورم النبذة: تخزين مستقل في settings/about --- */
  let abPhotoData = aboutGet().photo || ""; // الصورة المخصصة الحالية (فاضي = الافتراضية)
  const abMsg = document.getElementById("ab-msg");
  const setAbMsg = (t, good) => { abMsg.className = "msg " + (good ? "good" : "bad"); abMsg.textContent = t; };
  const abPrev = document.getElementById("ab-photo-prev");
  const abPhotoInp = document.getElementById("ab-photo");
  if (abPhotoInp) abPhotoInp.onchange = () => {
    const file = abPhotoInp.files && abPhotoInp.files[0];
    if (!file) return;
    if (!file.type || !file.type.startsWith("image/")) return setAbMsg("اختار ملف صورة.");
    const reader = new FileReader();
    reader.onerror = () => setAbMsg("مشكلة في قراءة الصورة.");
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => setAbMsg("الملف ده مش صورة صالحة.");
      img.onload = () => {
        const size = 256;
        const c = document.createElement("canvas");
        c.width = size; c.height = size;
        const ctx = c.getContext("2d");
        const min = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
        abPhotoData = c.toDataURL("image/jpeg", 0.82);
        abPrev.innerHTML = T("admin.adminProfile_2", { abPhotoData });
        setAbMsg("الصورة جاهزة — دوس «حفظ النبذة» عشان تتخزن.", true);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };
  const abPhotoDel = document.getElementById("ab-photodel");
  if (abPhotoDel) abPhotoDel.onclick = () => {
    abPhotoData = "";
    abPrev.innerHTML = T("admin.adminProfile_3");
    setAbMsg("الصورة المخصصة اتشالت — دوس «حفظ النبذة» للتأكيد.", true);
  };
  document.getElementById("ab-save").onclick = async () => {
    const btn = document.getElementById("ab-save");
    const val = (id) => (document.getElementById(id).value || "").trim();
    if (!val("ab-name")) return setAbMsg("الاسم مطلوب.");
    btn.disabled = true;
    setAbMsg("بنحفظ...");
    try {
      const data = buildAboutDoc({ name: val("ab-name"), title: val("ab-title"), short: val("ab-short"), long: val("ab-long"), skills: val("ab-skills"), wa: val("ab-wa"), fb: val("ab-fb"), yt: val("ab-yt"), tg: val("ab-tg"), li: val("ab-li") }, abPhotoData, serverNow());
      await useCases.saveSettingsSection("about", data);
      aboutState.cfg = Object.assign({}, aboutState.cfg || {}, data);
      adminLogAction("تعديل نبذة المهندس", "settings", "about", data.name);
      setAbMsg("تمام، النبذة اتحفظت ✅", true);
      showToast("تمام، النبذة اتحفظت ✅", "good");
    } catch (e) { setAbMsg("مشكلة: " + (e.message || e)); }
    btn.disabled = false;
  };

  /* --- أرقام صفحة الهبوط: settings/stats --- */
  const stMsg = document.getElementById("st-msg");
  const stIds = ["quizzes", "lessons", "students"];
  loadStatsSettings().then(() => {
    stIds.forEach((k) => { const el = document.getElementById("st-" + k); if (el && !el.dataset.dirty) el.value = statsGet()[k]; });
  });
  stIds.forEach((k) => { const el = document.getElementById("st-" + k); if (el) el.oninput = () => { el.dataset.dirty = "1"; }; });
  document.getElementById("st-save").onclick = async () => {
    const btn = document.getElementById("st-save");
    const rawSt = {};
    for (const k of stIds) rawSt[k] = document.getElementById("st-" + k).value;
    const parsed = parseStatsInputs(rawSt);
    if (parsed.error) { stMsg.className = "msg bad"; stMsg.textContent = parsed.error; return; }
    const vals = parsed.vals;
    btn.disabled = true;
    stMsg.className = "msg"; stMsg.textContent = "بنحفظ...";
    try {
      await useCases.saveSettingsSection("stats", { ...vals, updatedAt: serverNow() });
      set_statsCfg(Object.assign({}, statsCfg || {}, vals));
      adminLogAction("تعديل أرقام الصفحة الرئيسية", "settings", "stats", JSON.stringify(vals));
      stMsg.className = "msg good"; stMsg.textContent = "تمام، الأرقام اتحفظت ✅";
      showToast("تمام، الأرقام اتحفظت ✅", "good");
    } catch (e) { stMsg.className = "msg bad"; stMsg.textContent = "مشكلة: " + (e.message || e); }
    btn.disabled = false;
  };

  /* --- فورم جملة الأسفل: تخزين مستقل في settings/footer --- */
  const ftMsg = document.getElementById("ft-msg");
  const ftText = document.getElementById("ft-text");
  const ftPrev = document.getElementById("ft-prev");
  ftText.oninput = () => { ftPrev.textContent = ftText.value.trim() || "فكرة وإعداد: مهندس اسامه حسن عسس"; };
  document.getElementById("ft-save").onclick = async () => {
    const btn = document.getElementById("ft-save");
    const text = ftText.value.trim();
    const ftErr = validateFooterText(text);
    if (ftErr) { ftMsg.className = "msg bad"; ftMsg.textContent = ftErr; return; }
    btn.disabled = true;
    ftMsg.className = "msg"; ftMsg.textContent = "بنحفظ...";
    try {
      await useCases.saveSettingsSection("footer", { text, updatedAt: serverNow() });
      aboutState.footerText = text;
      adminLogAction("تعديل جملة أسفل الصفحات", "settings", "footer", text);
      ftMsg.className = "msg good"; ftMsg.textContent = "تمام، الجملة اتحفظت ✅";
      showToast("تمام، الجملة اتحفظت ✅", "good");
    } catch (e) { ftMsg.className = "msg bad"; ftMsg.textContent = "مشكلة: " + (e.message || e); }
    btn.disabled = false;
  };

  const pinMsg = document.getElementById("apr-pin-msg");
  const setPinMsg = (t, good) => { pinMsg.className = "msg " + (good ? "good" : "bad"); pinMsg.textContent = t; if (t) showToast(t, good ? "good" : "bad"); };
  document.getElementById("apr-pin-save").onclick = async () => {
    const p1 = document.getElementById("apr-pin1").value.trim();
    const p2 = document.getElementById("apr-pin2").value.trim();
    const pinErr = validateAdminPinChange(p1, p2);
    if (pinErr) return setPinMsg(pinErr);
    try {
      await useCases.changeAdminPin(myEmail, p1);
      setPinMsg("تمام، الرقم السري اتغير ✅", true);
    } catch (e) { setPinMsg("مشكلة: " + (e.message || e)); }
  };
}