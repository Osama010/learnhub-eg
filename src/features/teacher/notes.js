import { fbUser } from "../../core/session.js";
import { T } from "../../core/templates.js";
import { esc } from "../../core/utils.js";
import { teacherCache } from "./dashboard.js";
import { addStudentNote, deleteStudentNote, listStudentNotes } from "../../main/data.js";
import { fmtTs } from "../../domain/format.js";
import { validateNote } from "./notes.presenter.js";

/* ---------- ملاحظات المعلم الخاصة على كل طالب ---------- */
export async function openStudentNotes(sid) {
  const s = (teacherCache || []).find((x) => x.id === sid);
  if (!s) return;
  const ov = document.createElement("div");
  ov.className = "overlay";
  ov.innerHTML = T("teacher.openStudentNotes", { esc, s });
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  document.body.appendChild(ov);
  let notes = [];
  try {
    notes = await listStudentNotes(fbUser.uid, sid);
  } catch (e) {
    ov.querySelector(".muted").textContent = "مشكلة في التحميل: " + (e.message || e);
    return;
  }
  const card = ov.querySelector(".detailcard");
  card.innerHTML = T("teacher.openStudentNotes_2", { esc, fmtTs, notes, s });
  card.querySelector("#nt-close").onclick = () => ov.remove();
  card.querySelectorAll("[data-ndel]").forEach((b) => b.onclick = async () => {
    try {
      await deleteStudentNote(b.dataset.ndel);
      ov.remove();
      openStudentNotes(sid);
    } catch (e) { alert("مشكلة: " + (e.message || e)); }
  });
  card.querySelector("#nt-save").onclick = async () => {
    const text = card.querySelector("#nt-text").value.trim();
    const m = card.querySelector("#nt-msg");
    const bad = validateNote(text);
    if (bad) { m.className = "msg bad"; m.textContent = bad; return; }
    const btn = card.querySelector("#nt-save");
    btn.disabled = true;
    try {
      await addStudentNote(fbUser.uid, sid, text);
      ov.remove();
      openStudentNotes(sid);
    } catch (e) {
      btn.disabled = false;
      m.className = "msg bad"; m.textContent = "مشكلة: " + (e.message || e);
    }
  };
}