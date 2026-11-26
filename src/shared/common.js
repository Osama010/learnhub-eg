import { T } from "../core/templates.js";
import { esc } from "../core/utils.js";
import { aboutState } from "./about-state.js";

/* عناصر واجهة مشتركة (كانت جوه صفحة الهبوط وبتتستورد من كل الشاشات). */
export function downloadBlob(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
export function closing() {
  return T("app.closing", { esc, footerText: aboutState.footerText });
}
export function statusChip(st) {
  if (st === "approved") return T("app.statusChip");
  if (st === "rejected") return T("app.statusChip_2");
  if (st === "suspended") return T("app.statusChip_3");
  return T("app.statusChip_4");
}
