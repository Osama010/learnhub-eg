import { fbUser } from "../core/session.js";
import { getLang, onLangSave, setLang } from "./i18n.js";
import { initUserState, usGet, usSet } from "./user-state.js";

/* اللغة على حساب المستخدم: بتتحفظ في userState وبتتطبّق على أي جهاز بيدخل منه. قراءة واحدة بتتشارك مع باقي حالة المستخدم. */
let syncedUid = null;
let saveBound = false;
export function bindLangSync() {
  try {
    if (!saveBound) { saveBound = true; onLangSave((l) => { try { if (fbUser && fbUser.uid) usSet("lang", l); } catch (_) {} }); }
    if (!fbUser || !fbUser.uid || syncedUid === fbUser.uid) return;
    syncedUid = fbUser.uid;
    initUserState().then(() => {
      const saved = usGet("lang", null);
      if (saved === "en" || saved === "ar") { if (saved !== getLang()) setLang(saved, { save: false }); }
      else usSet("lang", getLang());
    }).catch(() => {});
  } catch (_) {}
}
