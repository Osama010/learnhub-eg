import { fbProfile, fbUser } from "../../core/session.js";
import { esc } from "../../core/utils.js";
import { contactView, waLink, waMessage } from "../../domain/contact.js";
import { getTeacherContact } from "../../main/data.js";
import { studentData } from "./shell.js";

/* ---------- كلّم مدرسك (واتساب/تليجرام) ----------
   مفيش شات جوه المنصة. بنفتح واتساب برقم المدرس برسالة جاهزة، ولينك الجروب لو المدرس حطه. القراءة (مستند واحد) لما الطالب يدوس بس. */
export function contactHtml(v, tName, sName) {
  if (!v) return '<span class="muted u-fs125px">المدرس لسه ما فعّلش التواصل.</span>';
  return (v.phone ? '<a class="btn sm" target="_blank" rel="noopener" href="' + esc(waLink(v.phone, waMessage(sName, tName))) + '">💬 واتساب مع المدرس</a> ' : "")
    + (v.group ? '<a class="btn sm ghost" target="_blank" rel="noopener" href="' + esc(v.group) + '">👥 جروب الفصل</a>' : "");
}
export function mountContact(anchor) {
  try {
    if (!anchor || !fbUser) return;
    const tids = (fbProfile && fbProfile.teacherIds) || [];
    const ts = tids.map((id) => (studentData.teachers || []).find((x) => x.id === id)).filter(Boolean);
    if (!ts.length) return;
    const box = document.createElement("div"); box.className = "card";
    box.innerHTML = '<h2 class="u-fs18px-mt0">💬 كلّم مدرسك</h2><div class="muted u-fs125px">بيفتح واتساب أو تليجرام برّه المنصة. المنصة مبتشوفش المحادثة.</div>'
      + ts.map((t) => '<div style="border-top:1px solid var(--line);padding:8px 0;"><b>' + esc(t.name || "") + '</b> <span data-ct="' + esc(t.id) + '"><button type="button" class="btn sm ghost" data-open="' + esc(t.id) + '">تواصل</button></span></div>').join("");
    anchor.insertAdjacentElement("afterend", box);
    box.querySelectorAll("[data-open]").forEach((b) => b.onclick = async () => {
      const t = ts.find((x) => x.id === b.dataset.open); b.disabled = true;
      try { b.parentElement.innerHTML = contactHtml(contactView(await getTeacherContact(t.id)), t.name, fbProfile && fbProfile.name); }
      catch (e) { b.disabled = false; b.textContent = "معرفتش، جرّب تاني"; }
    });
  } catch (e) { console.warn("التواصل مش شغال", e); }
}
