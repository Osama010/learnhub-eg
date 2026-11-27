/* View شاشة التسجيل: DOM بس (قراءة الفورم وتحديث العرض). مفيهاش قرارات ولا بيانات. */
import { showToast } from "../../shared/toast.js";
import { teacherShownForGrade } from "./register.presenter.js";

const el = (id) => document.getElementById(id);

export function readRegisterForm() {
  return {
    name: el("rg-name").value,
    email: el("rg-email").value,
    grade: el("rg-grade").value,
    phone: el("rg-phone").value,
    parentPhone: el("rg-parent-phone").value,
    pin: el("rg-pin").value,
    teacherIds: Array.from(document.querySelectorAll(".rg-t:checked"))
      .filter((c) => { const row = c.closest(".rg-t-row"); return !row || row.style.display !== "none"; })
      .map((c) => c.value),
  };
}

export function showRegMessage(t, good) {
  const m = el("rg-msg");
  if (m) { m.textContent = t || ""; m.className = "msg " + (good ? "good" : "bad"); }
  if (t) showToast(t, good ? "good" : "bad");
}

export function filterRegTeachers() {
  const grade = el("rg-grade").value;
  let visible = 0;
  document.querySelectorAll(".rg-t-row").forEach((row) => {
    const show = teacherShownForGrade(row.dataset.stages, grade, row.dataset.grades);
    row.style.display = show ? "" : "none";
    if (show) visible++;
  });
  const note = el("rg-t-note");
  if (note) note.style.display = visible === 0 && document.querySelectorAll(".rg-t-row").length ? "" : "none";
}

/** جاي من كارت مدرس في صفحة الهبوط: نختاره مسبقاً */
export function preselectTeacher() {
  try {
    const pre = localStorage.getItem("t4kPreTeacher");
    if (pre) {
      localStorage.removeItem("t4kPreTeacher");
      const cb = Array.from(document.querySelectorAll(".rg-t")).find((c) => c.value === pre);
      if (cb) cb.checked = true;
    }
  } catch (_) {}
}
