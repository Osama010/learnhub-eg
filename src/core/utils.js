/* ---------- مشترك ---------- */
import { installPartialRender } from "../shared/morph.js";
import { initI18n } from "../shared/i18n.js";
export const app = document.getElementById("app");
installPartialRender(app);
initI18n();

export function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
