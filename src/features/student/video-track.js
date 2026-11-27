import { fbUser } from "../../core/session.js";
import { FINISH_PCT } from "../../domain/lesson-report.js";
import { createTracker } from "../../domain/dropoff.js";
import { lessonActivity } from "./lesson-activity.js";

/* ---------- تتبّع مشاهدة الفيديو (يوتيوب بس) ----------
   بنسمع لرسايل مشغّل يوتيوب (postMessage) من غير تحميل أي سكريبت: بداية التشغيل، نسبة المشاهدة، الإنهاء، وأماكن الوقوف والرجوع (نقطة التسرب).
   Google Drive مبيطلّعش الوقت فمفيش تتبّع له. */
export function attachVideoTracking(box, lesson) {
  try {
    const iframe = box.querySelector("iframe");
    if (!iframe || !fbUser || !lesson || !lesson.teacherId) return;
    const tr = createTracker(), act = lessonActivity(lesson);
    let lastT = 0, state = -1, dur = 0, done = false;
    const push = (force) => { const snap = tr.take(); if (snap) act.note(snap); act.flush(force); };
    const post = (o) => { try { iframe.contentWindow.postMessage(JSON.stringify(o), "*"); } catch (_) {} };
    const hello = () => { post({ event: "listening", id: 1, channel: "widget" }); post({ event: "command", func: "addEventListener", args: ["onStateChange"] }); };
    iframe.addEventListener("load", hello);
    const stop = () => { if (done) return; done = true; tr.leave(); push(true); window.removeEventListener("message", onMsg); window.removeEventListener("pagehide", stop); window.removeEventListener("hashchange", onHash); document.removeEventListener("visibilitychange", onVis); };
    const onHash = () => { if (!box.isConnected) stop(); };
    const onVis = () => { if (document.visibilityState === "hidden") { tr.leave(); push(true); } };
    function onMsg(e) {
      if (e.source !== iframe.contentWindow || !/youtube(-nocookie)?\.com$/.test(String(e.origin).replace(/^https?:\/\//, ""))) return;
      let d; try { d = typeof e.data === "string" ? JSON.parse(e.data) : e.data; } catch (_) { return; }
      if (!d || typeof d !== "object") return;
      if (d.event === "onStateChange" && typeof d.info === "number") state = d.info;
      if (d.event === "infoDelivery" && d.info) {
        if (typeof d.info.playerState === "number") state = d.info.playerState;
        if (typeof d.info.currentTime === "number") lastT = d.info.currentTime;
        if (typeof d.info.duration === "number" && d.info.duration > 0) dur = d.info.duration;
      } else if (d.event !== "onStateChange") return;
      tr.sample(lastT, state, dur);
      if (state === 1) act.note({ playedAt: Date.now() });
      if (dur > 0) { const pct = (lastT / dur) * 100; act.note({ pct }); if (pct >= FINISH_PCT) act.note({ finishedAt: Date.now() }); }
      if (state === 0) { act.note({ finishedAt: Date.now(), pct: 100 }); }
      if (state === 2 || state === 0) push(false);
    }
    window.addEventListener("message", onMsg);
    window.addEventListener("pagehide", stop);
    window.addEventListener("hashchange", onHash);
    document.addEventListener("visibilitychange", onVis);
  } catch (e) { console.warn("تتبّع الفيديو مش شغال", e); }
}
