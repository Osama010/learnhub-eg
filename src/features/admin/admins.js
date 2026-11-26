import { fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { esc } from "../../core/utils.js";
import { adminCache, adminLayout } from "./shell.js";
import { bailIfSignedOut, showToast } from "../../shared/toast.js";
import { fmtTs } from "../../domain/format.js";
import { useCases } from "../../main/compose.js";
import { validateAdminInput, validateAdminPinChange } from "./admins.presenter.js";

/* ---------- المشرفين (أكتر من أدمن) ---------- */
function admMsg(t, good) {
  const m = document.getElementById("adm-msg");
  if (m) { m.className = "msg " + (good ? "good" : "bad"); m.textContent = t; }
  if (t) showToast(t, good ? "good" : "bad");
}

export function adminAdmins() {
  if (bailIfSignedOut()) return; // رندر متأخر بعد الخروج يرجع للدخول
  const admins = adminCache.admins || [];
  const myEmail = (fbUser && fbUser.email) || "";
  const content = T("admin.adminAdmins", { ADMIN_EMAIL, admins, esc, fmtTs, myEmail });
  adminLayout(content, "admins");
  document.getElementById("an-add").onclick = adminAddAdmin;
  document.getElementById("apc-btn").onclick = adminChangePin;
  document.querySelectorAll("[data-admdel]").forEach((b) => b.onclick = () => adminDeleteAdmin(b.dataset.admdel));
}

async function adminAddAdmin() {
  const inp = validateAdminInput(document.getElementById("an-name").value, document.getElementById("an-email").value);
  if (inp.error) return admMsg(inp.error);
  const { name, email } = inp;
  const btn = document.getElementById("an-add");
  btn.disabled = true;
  try {
    if ((adminCache.admins || []).some((a) => a.id === email)) {
      btn.disabled = false;
      return admMsg("الإيميل ده مسجل مشرف أصلاً.");
    }
    const doc = await useCases.addAdmin(email, name, (fbUser && fbUser.email) || "");
    adminCache.admins.push({ id: email, ...doc, addedAt: null });
    adminAdmins();
  } catch (e) {
    btn.disabled = false;
    admMsg("حصلت مشكلة: " + (e.message || e));
  }
}

async function adminDeleteAdmin(email) {
  if (email === ADMIN_EMAIL) return;
  if (!confirm(`متأكد إنك عايز تحذف المشرف ${email}؟ مش هيقدر يدخل اللوحة تاني.`)) return;
  try {
    await useCases.removeAdmin(email);
    adminCache.admins = (adminCache.admins || []).filter((a) => a.id !== email);
    adminAdmins();
  } catch (e) {
    alert("حصلت مشكلة: " + (e.message || e));
  }
}


function apcMsg(t, good) {
  const m = document.getElementById("apc-msg");
  if (m) { m.className = "msg " + (good ? "good" : "bad"); m.textContent = t; }
  if (t) showToast(t, good ? "good" : "bad");
}

// تغيير رقم الأدمن السري (PIN) من تاب المشرفين
async function adminChangePin() {
  const p1 = document.getElementById("apc-pin1").value.trim();
  const p2 = document.getElementById("apc-pin2").value.trim();
  const pinErr = validateAdminPinChange(p1, p2);
  if (pinErr) return apcMsg(pinErr);
  const btn = document.getElementById("apc-btn");
  btn.disabled = true;
  try {
    const email = (fbUser.email || "").toLowerCase();
    await useCases.changeAdminPin(email, p1);
    document.getElementById("apc-pin1").value = "";
    document.getElementById("apc-pin2").value = "";
    apcMsg("اتغيّر الرقم السري. هتستخدمه من أول مرة دخول جاية.", true);
  } catch (e) {
    apcMsg("حصلت مشكلة: " + (e.message || e));
  }
  btn.disabled = false;
}