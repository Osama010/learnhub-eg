
import { T } from "../core/templates.js";
import { getSettings } from "../main/data.js";
import { currentTermOf, isTermWritable, termOf } from "../domain/term.js";

/* ---------- الترمين ----------
   الأدمن يحدد الترم الحالي في settings/app { currentTerm: 1|2 }.
   المحتوى القديم (من غير حقل term) بيتعامل كأنه ترم أول.
   لما الترم الحالي يبقى الثاني، محتوى الترم الأول يفضل ظاهر للقراءة بس. */
export var appSettings = { currentTerm: 1 };
export function termCurrent() { return currentTermOf(appSettings); }
export function termWritable(item) { return isTermWritable(item, termCurrent()); }

export async function loadAppSettings() {
  try {
    const d = await getSettings("app");
    if (d && d.currentTerm === 2) appSettings.currentTerm = 2;
    else appSettings.currentTerm = 1;
  } catch (_) { appSettings.currentTerm = 1; }
}

/* تابات فلتر الترم (طالب/مدرس): الافتراضي الترم الحالي */
export function termTabsHtml(active) {
  return T("app.termTabsHtml", { active });
}
export function bindTermTabs(onPick) {
  document.querySelectorAll("[data-term]").forEach((b) => b.onclick = () => onPick(Number(b.dataset.term)));
}
/* شارة «للقراءة بس» على محتوى ترم قد خلص */
export function termRoChip(item) {
  return termWritable(item) ? "" : T("app.termRoChip");
}

/* مودال تأكيد عام (حذف نهائي / نقل جماعي): بيرجع عنصر الأوفرلاي بعد إضافته */
export function openConfirmOverlay(innerHtml) {
  const ov = document.createElement("div");
  ov.className = "overlay";
  ov.innerHTML = T("app.openConfirmOverlay", { innerHtml });
  ov.onclick = (e) => { if (e.target === ov) ov.remove(); };
  document.body.appendChild(ov);
  return ov;
}