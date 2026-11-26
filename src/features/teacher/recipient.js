import { T } from "../../core/templates.js";
import { esc } from "../../core/utils.js";
import { RECIPIENT_MODES, normMode } from "./recipient.presenter.js";

/* ---------- اختيار المستلم (ولي الأمر / الطالب): بيتحفظ على الجهاز ---------- */
const MODE_KEY = "t4k_wa_recipient";
export function getRecipientMode() {
  try { return normMode(localStorage.getItem(MODE_KEY)); } catch (e) { return "parent"; }
}
export function setRecipientMode(m) {
  try { localStorage.setItem(MODE_KEY, normMode(m)); } catch (e) { /* التخزين مش متاح */ }
  return normMode(m);
}
/** قايمة الاختيار: id بيتحدد من الشاشة اللي بتستخدمها. */
export const recipientPickHtml = (id, mode) => T("teacher.recipientPick", { RECIPIENT_MODES, esc, id, mode: normMode(mode) });
