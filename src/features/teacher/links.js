import { BASE, fbProfile, fbUser } from "../../core/session.js";
import { esc } from "../../core/utils.js";
import { inviteLink, inviteText, pageLink, pageStatsOf, validateBio } from "../../domain/teacher-page.js";
import { showToast } from "../../shared/toast.js";
import { batchUpdateTeacher, newBatch } from "../../main/data.js";
import { teacherCache } from "./dashboard.js";
import { lessonsState } from "./lessons.js";

/* ---------- صفحة المدرس العامة + لينك الدعوة ---------- */
const siteBase = () => { try { const u = new URL(BASE || "./", location.href); u.hash = ""; u.search = ""; return u.href; } catch (_) { return location.origin + "/"; } };
const copy = async (t) => { try { await navigator.clipboard.writeText(t); showToast("اتنسخ ✅", "good"); } catch (_) { prompt("انسخ اللينك:", t); } };

export function linksCardHtml(p, base, uid) {
  const on = p.pageOn === true;
  const inv = inviteLink(base, uid), pg = pageLink(base, uid);
  return '<h2 class="u-fs18px-mt0">🔗 لينك الدعوة وصفحتك العامة</h2>'
    + '<div class="muted u-fs125px" style="margin-bottom:8px;">ابعت لينك الدعوة لطلابك: بيفتح التسجيل ومدرسك متحدد، وطلبهم بييجيلك تقبله زي المعتاد.</div>'
    + '<div class="inp ltr" style="word-break:break-all;font-size:12.5px;">' + esc(inv) + "</div>"
    + '<div class="btnrow" style="margin:6px 0 12px;"><button type="button" class="btn sm" id="lk-copy-inv">نسخ لينك الدعوة</button><a class="btn sm green" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(inviteText(p.name, inv)) + '">مشاركة واتساب</a></div>'
    + '<h3 class="u-fs15px-m12px04px">الصفحة العامة (اختيارية)</h3>'
    + '<textarea id="lk-bio" class="inp" rows="3" maxlength="300" placeholder="نبذة عنك: خبرتك وطريقتك في الشرح...">' + esc(p.pageBio || "") + "</textarea>"
    + '<label class="btnrow" style="gap:8px;margin:8px 0;"><input type="checkbox" id="lk-on"' + (on ? " checked" : "") + '> <span>اعرض صفحتي للعامة (الاسم والمادة والمراحل والنبذة وأرقام عامة)</span></label>'
    + '<button type="button" class="btn" id="lk-save">حفظ وتحديث الأرقام</button>'
    + (on ? '<div class="btnrow" style="margin-top:8px;"><button type="button" class="btn sm ghost" id="lk-copy-pg">نسخ لينك صفحتك</button><a class="btn sm ghost" target="_blank" rel="noopener" href="' + esc(pg) + '">معاينة</a></div>' : "")
    + '<div class="muted u-fs12px" style="margin-top:6px;">الأرقام (عدد الطلاب والدروس والكويزات) بتتحسب لما تضغط حفظ، مش لحظيًا. مفيش بيانات طلاب بتظهر.</div><div class="msg" id="lk-msg"></div>';
}
export function mountLinks(anchor) {
  try {
    if (!anchor || !fbUser) return;
    const box = document.createElement("div"); box.className = "card";
    anchor.insertAdjacentElement("afterend", box);
    const draw = () => {
      box.innerHTML = linksCardHtml(fbProfile || {}, siteBase(), fbUser.uid);
      const base = siteBase();
      box.querySelector("#lk-copy-inv").onclick = () => copy(inviteLink(base, fbUser.uid));
      const cp = box.querySelector("#lk-copy-pg"); if (cp) cp.onclick = () => copy(pageLink(base, fbUser.uid));
      box.querySelector("#lk-save").onclick = async (ev) => {
        const m = box.querySelector("#lk-msg");
        const b = validateBio(box.querySelector("#lk-bio").value);
        if (b.error) { m.className = "msg bad"; m.textContent = b.error; return; }
        ev.currentTarget.disabled = true;
        const on = box.querySelector("#lk-on").checked;
        const students = (teacherCache || []).filter((s) => s.status === "approved").length;
        const pageStats = pageStatsOf({ students, lessons: (lessonsState.lessons || []).length, quizzes: (lessonsState.quizzes || []).length, now: Date.now() });
        try {
          const batch = newBatch();
          const f = { pageBio: b.bio, pageOn: on, pageStats };
          batchUpdateTeacher(batch, fbUser.uid, f, f);
          await batch.commit();
          Object.assign(fbProfile, f);
          showToast(on ? "الصفحة العامة اتحدّثت ✅" : "الصفحة العامة مقفولة", "good");
        } catch (e) { showToast("مشكلة في الحفظ: " + ((e && e.message) || e), "bad"); }
        draw();
      };
    };
    draw();
  } catch (e) { console.warn("اللينكات مش شغالة", e); }
}
