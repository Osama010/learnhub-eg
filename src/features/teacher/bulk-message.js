import { fbProfile, fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { app, esc } from "../../core/utils.js";
import { renderLogin } from "../auth/login.js";
import { closing } from "../../shared/common.js";
import { bindTeacherTabs, teacherCache, teacherLoad, teacherTabs } from "./dashboard.js";
import { gradeSelectHtml } from "./lessons.js";
import { STAGE_NAMES } from "./lessons.presenter.js";
import { resolveStage } from "./announcements.presenter.js";
import { bailIfSignedOut } from "../../shared/toast.js";
import { waLink } from "../../shared/transfer.js";
import { getRecipientMode, recipientPickHtml, setRecipientMode } from "./recipient.js";
import { BULK_TEMPLATES, bulkKey, bulkRows, bulkSummary, bulkTargets, templateText } from "./bulk-message.presenter.js";

/* ---------- رسالة لصف: زرار واتساب لكل ولي أمر (من غير إرسال آلي) ---------- */
let bulkStage = "";
let bulkGrade = "";
let bulkText = "";
let bulkMode = "parent";
let bulkSel = null; // Set من ids المختارين (null = الكل)

import { usGet, usSet } from "../../shared/user-state.js";
function readDone(text) {
  try { const all = usGet("bulkDone", {}); return all[bulkKey(text)] || []; } catch (e) { return []; }
}
function markDone(text, id) {
  try {
    const all = { ...usGet("bulkDone", {}) };
    const k = bulkKey(text); const cur = new Set(all[k] || []); cur.add(id);
    all[k] = [...cur];
    const keys = Object.keys(all); if (keys.length > 30) delete all[keys[0]];
    usSet("bulkDone", all);
  } catch (e) { /* التخزين مش متاح: العلامة بس هتتخطى */ }
}

function drawList() {
  const students = bulkTargets(teacherCache, bulkStage, bulkGrade);
  if (!bulkSel) bulkSel = new Set(students.map((s) => s.id));
  const selected = new Set(students.filter((s) => bulkSel.has(s.id)).map((s) => s.id));
  const rows = bulkRows(students, bulkText, readDone(bulkText), bulkMode);
  const sum = bulkSummary(rows, [...selected]);
  const host = document.getElementById("bk-list");
  host.innerHTML = T("teacher.bulkListHtml", { bulkMode, esc, rows, selected, sum, waLink });
  host.querySelectorAll("[data-bsel]").forEach((c) => c.onchange = () => { c.checked ? bulkSel.add(c.dataset.bsel) : bulkSel.delete(c.dataset.bsel); drawList(); });
  host.querySelector("#bk-all") && (host.querySelector("#bk-all").onclick = () => { bulkSel = new Set(students.map((s) => s.id)); drawList(); });
  host.querySelector("#bk-none") && (host.querySelector("#bk-none").onclick = () => { bulkSel = new Set(); drawList(); });
  host.querySelectorAll("[data-bdone]").forEach((a) => a.addEventListener("click", () => { markDone(bulkText, a.dataset.bdone); setTimeout(drawList, 300); }));
}

export async function renderTeacherBulk() {
  if (bailIfSignedOut()) return;
  if (!fbUser) return renderLogin();
  app.innerHTML = T("teacher.renderBulk");
  try { await teacherLoad(); } catch (e) { app.innerHTML = T("teacher.renderBulk_2", { e, esc }); return; }
  const myStages = (fbProfile && fbProfile.stages) || [];
  bulkMode = getRecipientMode();
  bulkStage = resolveStage(bulkStage, myStages);
  app.innerHTML = T("teacher.renderBulk_3", { BULK_TEMPLATES, bulkMode, recipientPickHtml, STAGE_NAMES, bulkGrade, bulkStage, bulkText, closing, esc, gradeSelectHtml, myStages, teacherTabs });
  bindTeacherTabs();
  document.getElementById("bk-stage").onchange = (e) => { bulkStage = e.target.value; bulkGrade = ""; bulkSel = null; renderTeacherBulk(); };
  document.getElementById("bk-grade").onchange = (e) => { bulkGrade = e.target.value; bulkSel = null; drawList(); };
  document.getElementById("bk-tpl").onchange = (e) => {
    const t = templateText(e.target.value, bulkMode);
    if (t) { bulkText = t; document.getElementById("bk-text").value = t; drawList(); }
  };
  document.getElementById("bk-mode").onchange = (e) => { bulkMode = setRecipientMode(e.target.value); drawList(); };
  document.getElementById("bk-text").oninput = (e) => { bulkText = e.target.value; drawList(); };
  drawList();
}
