import { fbUser } from "../../core/session.js";
import { validateContact } from "../../domain/contact.js";
import { getTeacherContact, saveTeacherContact } from "../../main/data.js";
import { esc } from "../../core/utils.js";

/* ---------- تواصل الطلاب معاك (مدرس): رقم واتساب ولينك جروب. بيظهروا لطلابك المسجلين عندك بس، وإنت اللي بتقرر ---------- */
export function mountTeacherContact(anchor) {
  try {
    if (!anchor || !fbUser) return;
    const box = document.createElement("div"); box.className = "card";
    box.innerHTML = '<h2 class="u-fs18px-mt0">💬 تواصل الطلاب معاك</h2><div class="muted u-fs125px" style="margin-bottom:8px;">الطالب بيدوس «كلّم مدرسك» فيفتح واتساب برقمك، ولينك الجروب بيظهر له. المنصة مبتخزّنش رسايل ومبتستهلكش من الحد المجاني. الرقم واللينك بيظهروا لطلابك المسجلين عندك بس.</div><button type="button" class="btn sm" id="tc-load">إعداد التواصل</button><div id="tc-body"></div>';
    anchor.insertAdjacentElement("afterend", box);
    const body = box.querySelector("#tc-body"), btn = box.querySelector("#tc-load");
    btn.onclick = async () => {
      btn.disabled = true;
      try {
        const cur = (await getTeacherContact(fbUser.uid)) || {};
        btn.remove();
        body.innerHTML = '<input id="tc-phone" class="inp" dir="ltr" inputmode="tel" placeholder="رقم واتساب (اختياري) 01012345678" value="' + esc(cur.phone || "") + '">'
          + '<input id="tc-group" class="inp" dir="ltr" placeholder="لينك جروب واتساب أو تليجرام (اختياري) https://chat.whatsapp.com/..." value="' + esc(cur.groupLink || "") + '">'
          + '<label class="btnrow" style="gap:6px;margin:6px 0;"><input type="checkbox" id="tc-on"' + (cur.on ? " checked" : "") + '> أظهر ده لطلابي</label>'
          + '<button type="button" class="btn sm" id="tc-save">حفظ</button><div class="msg" id="tc-msg" style="margin-top:6px;"></div>';
        const msg = (t, good) => { const m = body.querySelector("#tc-msg"); m.textContent = t; m.className = "msg " + (good ? "good" : "bad"); };
        body.querySelector("#tc-save").onclick = async (ev) => {
          const g = (id) => body.querySelector(id);
          const r = validateContact({ phone: g("#tc-phone").value, groupLink: g("#tc-group").value, on: g("#tc-on").checked });
          if (r.error) return msg(r.error);
          ev.currentTarget.disabled = true;
          try { await saveTeacherContact(fbUser.uid, { ...r.doc, updatedAt: Date.now() }); msg(r.doc.on ? "اتحفظ، وبيظهر لطلابك ✅" : "اتحفظ (مخفي عن الطلاب لحد ما تفعّله).", true); }
          catch (e) { msg("معرفتش أحفظ: " + ((e && e.message) || e)); }
          ev.currentTarget.disabled = false;
        };
      } catch (e) { btn.disabled = false; body.innerHTML = '<div class="msg bad">معرفتش أحمّل الإعدادات.</div>'; }
    };
  } catch (e) { console.warn("تواصل الطلاب مش شغال", e); }
}
