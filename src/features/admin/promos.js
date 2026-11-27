import { esc } from "../../core/utils.js";
import { PROMO_KINDS, promoLabel, promoStatus, validatePromo } from "../../domain/promo.js";
import { bumpPromoUse, deletePromo, getPromo, listPromos, savePromo, serverNow, updatePromo } from "../../main/data.js";
import { subDateStr } from "../../domain/subscription.js";
import { trialSubData } from "../../domain/promo.js";

/* ---------- أكواد التجربة والخصم (أدمن) ---------- */
export function listHtml(list) {
  if (!list.length) return '<div class="muted">لسه مفيش أكواد.</div>';
  return list.map((p) => {
    const st = promoStatus(p, Date.now());
    return '<div class="an-row" style="align-items:center;"><span><b dir="ltr">' + esc(p.code) + "</b> · " + esc(promoLabel(p)) + (p.note ? " · " + esc(p.note) : "")
      + '<br><span class="muted u-fs12px">اتستخدم ' + (p.uses || 0) + (p.maxUses ? " من " + p.maxUses : "") + (p.expiresAt ? " · ينتهي " + esc(p.expiresAt) : "") + " · " + (st.ok ? "شغال" : esc(st.why)) + "</span></span>"
      + '<span><button type="button" class="btn sm ghost" data-pt="' + esc(p.code) + '">' + (p.active === false ? "تفعيل" : "إيقاف") + '</button> <button type="button" class="btn sm ghost" data-pd="' + esc(p.code) + '">مسح</button></span></div>';
  }).join("");
}
export async function mountPromos(anchor) {
  try {
    if (!anchor) return;
    const box = document.createElement("div");
    box.className = "card";
    anchor.insertAdjacentElement("afterend", box);
    let list = [];
    const draw = () => {
      box.innerHTML = '<h2 class="u-fs18px-mt0">🎟️ أكواد التجربة والخصم</h2><div class="muted u-fs125px">المدرس الجديد بيكتب الكود في طلب التسجيل، وأنت بتشوفه وإنت بتقبل الطلب. التجربة بتتعبّى في الاشتراك لوحدها. الخصم تنبيه بس.</div>'
        + '<div id="pm-list" style="margin:8px 0;">' + listHtml(list) + "</div>"
        + '<div class="grid2"><input id="pm-code" class="inp" dir="ltr" maxlength="20" placeholder="الكود (مثلا WELCOME14)"><select id="pm-kind" class="inp">' + Object.keys(PROMO_KINDS).map((k) => '<option value="' + k + '">' + PROMO_KINDS[k] + "</option>").join("") + "</select></div>"
        + '<div class="grid2"><input id="pm-val" class="inp" type="number" min="1" max="100" placeholder="أيام التجربة أو نسبة الخصم"><input id="pm-max" class="inp" type="number" min="0" placeholder="أقصى عدد استخدامات (0 = من غير حد)"></div>'
        + '<div class="grid2"><input id="pm-exp" class="inp" type="date" title="تاريخ الانتهاء (اختياري)"><input id="pm-note" class="inp" maxlength="80" placeholder="ملاحظة (اختياري)"></div>'
        + '<button type="button" class="btn" id="pm-add">إضافة الكود</button><div id="pm-msg" class="msg" style="margin-top:6px;"></div>';
      const msg = (t, good) => { const m = box.querySelector("#pm-msg"); m.textContent = t; m.className = "msg " + (good ? "good" : "bad"); };
      box.querySelector("#pm-add").onclick = async () => {
        const g = (id) => box.querySelector(id).value;
        const r = validatePromo({ code: g("#pm-code"), kind: g("#pm-kind"), value: g("#pm-val"), maxUses: g("#pm-max"), expiresAt: g("#pm-exp"), note: g("#pm-note") });
        if (r.error) return msg(r.error);
        if (list.some((p) => p.code === r.doc.code)) return msg("الكود ده موجود قبل كده.");
        try { await savePromo(r.doc.code, { ...r.doc, uses: 0, createdAt: serverNow() }); list = await listPromos(); draw(); }
        catch (e) { msg("معرفتش أحفظ الكود: " + ((e && e.message) || e)); }
      };
      box.querySelectorAll("[data-pt]").forEach((b) => b.onclick = async () => {
        const p = list.find((x) => x.code === b.dataset.pt); if (!p) return;
        try { await updatePromo(p.code, { active: p.active === false }); list = await listPromos(); draw(); } catch (e) { msg("فشل التعديل."); }
      });
      box.querySelectorAll("[data-pd]").forEach((b) => b.onclick = async () => {
        if (!confirm("مسح الكود " + b.dataset.pd + "؟")) return;
        try { await deletePromo(b.dataset.pd); list = await listPromos(); draw(); } catch (e) { msg("فشل المسح."); }
      });
    };
    list = await listPromos();
    draw();
  } catch (e) { console.warn("أكواد الخصم مش شغالة", e); }
}

/** عند قبول طلب فيه كود: يعرض حالته وللتجربة يعبّي الاشتراك. card = كارت فورم الإضافة. */
export async function applyPromoToForm(promoCode, card) {
  try {
    const note = document.createElement("div");
    note.style.cssText = "margin:0 0 10px;";
    card.insertBefore(note, card.children[1] || null);
    const doc = await getPromo(promoCode);
    const st = promoStatus(doc, Date.now());
    if (!st.ok) { note.className = "msg bad"; note.textContent = "كود الطلب " + promoCode + ": " + st.why + " (الاشتراك متعدلش)."; return; }
    if (doc.kind === "discount") { note.className = "msg good"; note.textContent = "كود الطلب " + promoCode + ": خصم " + doc.discountPct + "% على أول دفع (تنبيه بس، اطبقه وإنت بتسجل الدفعة)."; return; }
    const d = trialSubData(doc, subDateStr(new Date()));
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    const t = document.getElementById("ta-subtype");
    if (t) { t.value = d.subType; t.dispatchEvent(new Event("change")); }
    set("ta-substart", d.subStart); set("ta-subend", d.subEnd); set("ta-subamount", "0");
    note.className = "msg good"; note.textContent = "كود الطلب " + promoCode + ": تجربة " + doc.trialDays + " يوم اتعبّت في الاشتراك (بتقدر تعدلها).";
  } catch (e) { console.warn("تعذر قراءة الكود", e); }
}
export const countPromoUse = (code) => bumpPromoUse(code).catch((e) => console.warn("عدّاد الكود", e));
