import { fbProfile, fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { esc } from "../../core/utils.js";
import { renderTeacherLessons } from "./lessons.js";
import { listBankOfTeacher, deleteBankItem, batchAddBankItem, batchBumpBankUse } from "../../main/data.js";
import { newBatch } from "../../main/data.js";
import { qFromStored } from "../../domain/quiz.js";
import { serverNow } from "../../main/data.js";
import { TYPE_LABELS, bankItemDoc, bankNewestFirst, bankRowMatches } from "./question-bank.presenter.js";

/* ---------- بنك الأسئلة ---------- */
export async function saveToBank(questions) {
  if (!questions.length) return;
  const batch = newBatch();
  questions.forEach((q) => {
    batchAddBankItem(batch, bankItemDoc({ uid: fbUser.uid, profile: fbProfile, q, createdAt: serverNow() }));
  });
  await batch.commit();
}

export async function openBankPicker(qs, stage) {
  const ov = document.createElement("div");
  ov.className = "overlay";
  ov.innerHTML = T("teacher.openBankPicker");
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  document.body.appendChild(ov);
  let bank = [];
  try {
    const snap = await listBankOfTeacher(fbUser.uid);
    bank = bankNewestFirst(snap);
  } catch (e) {
    ov.querySelector(".muted").textContent = "مشكلة في تحميل البنك: " + (e.message || e);
    return;
  }
  const typeLbl = TYPE_LABELS;
  const card = ov.querySelector(".detailcard");
  const listHtml = bank.length ? bank.map((bq) => T("teacher.openBankPicker_2", { bq, esc, typeLbl })).join("")
    : T("teacher.openBankPicker_3");
  card.innerHTML = T("teacher.openBankPicker_4", { bank, listHtml });
  card.querySelector("#bk-cancel").onclick = () => ov.remove();
  card.querySelector("#bk-search").oninput = (e) => {
    const t = e.target.value.trim();
    card.querySelectorAll("[data-brow]").forEach((row) => {
      const txt = row.querySelector("[data-btxt]").textContent;
      row.style.display = bankRowMatches(txt, t) ? "" : "none";
    });
  };
  card.querySelectorAll("[data-bdel]").forEach((b) => b.onclick = async () => {
    if (!confirm("تحذف السؤال ده من البنك؟ (الكويزات اللي استخدمته مش هتتأثر)")) return;
    try {
      await deleteBankItem(b.dataset.bdel);
      const row = card.querySelector(`[data-brow="${b.dataset.bdel}"]`);
      if (row) row.remove();
      bank = bank.filter((x) => x.id !== b.dataset.bdel);
      if (!bank.length) card.querySelector("#bk-add").disabled = true;
    } catch (e) { alert("مشكلة: " + (e.message || e)); }
  });
  const addBtn = card.querySelector("#bk-add");
  if (addBtn) addBtn.onclick = async () => {
    const picked = Array.from(card.querySelectorAll("[data-bsel]:checked")).map((c) => bank.find((x) => x.id === c.dataset.bsel)).filter(Boolean);
    if (!picked.length) { alert("علّم على سؤال واحد على الأقل."); return; }
    picked.forEach((bq) => { if (bq.q) qs.push(qFromStored(bq.q)); });
    try {
      const batch = newBatch();
      picked.forEach((bq) => batchBumpBankUse(batch, bq.id, (bq.useCount || 0) + 1));
      await batch.commit();
    } catch (_) {}
    ov.remove();
    renderTeacherLessons(stage);
  };
}