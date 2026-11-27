import { fbUser } from "../../core/session.js";
import { esc } from "../../core/utils.js";
import { backupAgeDays, backupDue, restorePlan } from "./backup.presenter.js";
import { downloadFullBackup, LAST_BACKUP_KEY } from "./backup.js";
import { lessonsState } from "./lessons.js";
import { teacherLoadLessons } from "./dashboard.js";
import { restoreDoc, saveLessonMedia, toStoredTime } from "../../main/data.js";
import { showToast } from "../../shared/toast.js";

/* ---------- تذكير النسخة الاحتياطية (لوحة المدرس) + استرجاع من ملف (صفحة المتابعة). بيتحمّلوا بس لما يتفتحوا. ---------- */
const SNOOZE_KEY = "t4kBackupSnooze";
const num = (k) => { try { return Number(usGet(k === SNOOZE_KEY ? "backupSnooze" : "backupLast", 0)) || 0; } catch (_) { return 0; } };
import { usGet, usSet } from "../../shared/user-state.js";

/** بانر تذكير لو آخر نسخة أقدم من 7 أيام (أو ماعملش نسخة قبل كده). «بعدين» بتسكته يوم. */
export function mountBackupReminder(anchor) {
  try {
    if (!anchor) return;
    const now = Date.now(), last = num(LAST_BACKUP_KEY);
    if (!backupDue(last, now) || now - num(SNOOZE_KEY) < 86400000) return;
    const age = backupAgeDays(last, now);
    const box = document.createElement("div");
    box.className = "card tint-amber u-bord4pxsolidvaramber";
    box.innerHTML = '<b>💾 وقت النسخة الاحتياطية</b><div class="u-fs14px" style="margin-top:4px;">' + (age == null ? "لسه ما نزّلتش نسخة احتياطية لبياناتك." : "عدّى " + age + " يوم على آخر نسخة احتياطية نزّلتها من هنا.") + ' نزّل نسخة دلوقتي عشان دروسك وكويزاتك تفضل في أمان.</div><div class="btnrow" style="margin-top:8px;"><button type="button" class="btn sm" id="bkr-go">نزّل نسخة دلوقتي</button><button type="button" class="btn sm ghost" id="bkr-later">بعدين</button></div>';
    anchor.insertAdjacentElement("afterend", box);
    box.querySelector("#bkr-later").onclick = () => { try { usSet("backupSnooze", Date.now()); } catch (_) {} box.remove(); };
    const go = box.querySelector("#bkr-go");
    go.onclick = async () => { go.disabled = true; try { await downloadFullBackup(); showToast("اتنزلت النسخة الاحتياطية ✅"); box.remove(); } catch (e) { go.disabled = false; showToast("مشكلة: " + (e.message || e)); } };
  } catch (e) { console.warn("تذكير النسخة مش شغال", e); }
}

/** كارت الاسترجاع: بيرفع الدروس والكويزات والامتحانات الناقصة بس، ومابيكتبش فوق حاجة موجودة. */
export function mountRestoreCard(anchorCard) {
  try {
    if (!anchorCard || !fbUser) return;
    const box = document.createElement("div");
    box.className = "card";
    box.innerHTML = '<h2 class="u-fs18px-mt0">♻️ استرجاع من نسخة احتياطية</h2><p class="muted u-fs125px-m006px">اختار ملف النسخة (JSON) اللي نزّلته من هنا. بيرجّع الدروس والكويزات والامتحانات اللي اتمسحت بس، وأي حاجة موجودة دلوقتي مابتتغيرش. الطلاب ونتايجهم وملفات الـ PDF المرفوعة مابتتسترجعش (روابط الفيديو والـ PDF الخارجية بترجع).</p><div class="btnrow"><input type="file" id="rs-file" accept="application/json,.json" class="inp"></div><div id="rs-out"></div>';
    anchorCard.insertAdjacentElement("afterend", box);
    const out = box.querySelector("#rs-out");
    box.querySelector("#rs-file").onchange = async (ev) => {
      const f = ev.target.files && ev.target.files[0];
      if (!f) return;
      out.innerHTML = '<div class="spin">بنقرأ الملف...</div>';
      try {
        if (f.size > 25 * 1024 * 1024) throw new Error("الملف كبير أوي.");
        const backup = JSON.parse(await f.text());
        await teacherLoadLessons();
        const s = lessonsState, ids = (a) => new Set((a || []).map((x) => x.id));
        const plan = restorePlan({ backup, uid: fbUser.uid, existing: { lessons: ids(s.lessons), quizzes: ids(s.quizzes), exams: ids(s.exams) }, toStored: toStoredTime });
        if (plan.error) { out.innerHTML = '<p class="msg bad">' + esc(plan.error) + "</p>"; return; }
        if (!plan.items.length) { out.innerHTML = '<p class="msg">مفيش حاجة ناقصة. كل اللي في النسخة موجود عندك دلوقتي.</p>'; return; }
        out.innerHTML = '<p style="line-height:1.9;">هيترجّع: <b>' + plan.counts.lessons + "</b> درس، <b>" + plan.counts.quizzes + "</b> كويز، <b>" + plan.counts.exams + '</b> امتحان.<br><span class="muted u-fs125px">الموجود بالفعل مابيتلمسش (' + (plan.kept.lessons + plan.kept.quizzes + plan.kept.exams) + ' عنصر). عناصر الترم القديم ممكن تترفض لو الترم الحالي اتغيّر.</span></p><button type="button" class="btn" id="rs-go">استرجع دلوقتي</button><p class="msg" id="rs-msg"></p>';
        out.querySelector("#rs-go").onclick = async (e) => {
          const b = e.currentTarget; b.disabled = true;
          const msg = out.querySelector("#rs-msg"); let ok = 0; const failed = [];
          for (const it of plan.items.filter((x) => x.col === "lessons").concat(plan.items.filter((x) => x.col !== "lessons"))) {
            try { await restoreDoc(it.col, it.id, it.data); ok++; } catch (err) { failed.push(it); }
          }
          const failedLessons = new Set(failed.filter((x) => x.col === "lessons").map((x) => x.id));
          let mediaOk = 0;
          for (const m of plan.media.filter((x) => !failedLessons.has(x.lessonId))) { try { await saveLessonMedia(m.lessonId, { teacherId: fbUser.uid, videoUrl: m.videoUrl, pdfUrl: m.pdfUrl, pdfFile: null }); mediaOk++; } catch (_) {} }
          msg.className = "msg " + (failed.length ? "bad" : "ok");
          msg.textContent = "اتسترجع " + ok + " عنصر" + (mediaOk ? " و" + mediaOk + " رابط فيديو/PDF" : "") + (failed.length ? " · " + failed.length + " اترفضوا (غالبًا من ترم قديم)" : "") + ".";
          showToast("خلص الاسترجاع");
        };
      } catch (err) { out.innerHTML = '<p class="msg bad">الملف مش مقروء: ' + esc(String(err.message || err)) + "</p>"; }
    };
  } catch (e) { console.warn("الاسترجاع مش شغال", e); }
}
