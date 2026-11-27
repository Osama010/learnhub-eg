import { fbUser } from "../core/session.js";
import { getUserState, saveUserState } from "../main/data.js";
import { createUserState } from "../application/user-state.js";

/* حالة المستخدم عبر الأجهزة: التوصيل بالمتصفح وFirestore (المنطق في application/user-state.js). */
const us = createUserState({ getUid: () => (fbUser && fbUser.uid) || "", storage: window.localStorage, remoteGet: getUserState, remoteSave: saveUserState });
export const initUserState = () => us.initUserState();
export const flush = () => us.flush();
export const usGet = (k, f) => us.usGet(k, f);
export const usSet = (k, v) => us.usSet(k, v);
try { document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); }); } catch (_) {}
