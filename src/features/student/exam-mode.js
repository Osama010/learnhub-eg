import { cleanMinutes, draftKey, fmtClock, makeDraft, parseDraft, remainingMs, timerOf } from "../../domain/exam-mode.js";

/* ---------- وضع الامتحان (بيتحمّل بس لما الاختبار يكون ليه مؤقت) ----------
   مؤقت + سؤال سؤال من غير رجوع + حفظ تلقائي للإجابات على الجهاز (لو النت قطع أو الصفحة اتقفلت يكمّل من مكانه والوقت ماشي).
   ملحوظة: ده كله في المتصفح، فهو بيصعّب الغش العادي مش بيمنعه. */
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} },
  del: (k) => { try { localStorage.removeItem(k); } catch (_) {} },
};

function restore(questions, given) {
  questions.forEach((q, i) => {
    const g = given[i];
    if (g == null) return;
    if (q.type === "mcq" || q.type === "tf") { const el = document.querySelector(`input[name="sq${i}"][value="${g}"]`); if (el) el.checked = true; }
    else if (q.type === "multi") (g || []).forEach((v) => { const el = document.querySelector(`input[name="sq${i}"][value="${v}"]`); if (el) el.checked = true; });
    else if (q.type === "match") (g || []).forEach((v, pi) => { const el = document.querySelector(`[data-sqm="${i}:${pi}"]`); if (el) el.value = v; });
    else { const el = document.querySelector(`[data-sqt="${i}"]`); if (el) el.value = g; }
  });
}

/** gather: بترجع إجابات الشاشة. submit(force): بتسلّم. بترجع دالة إيقاف. */
export function startExamMode({ uid, item, questions, gather, submit, isExam }) {
  const minutes = timerOf(item);
  if (!minutes || !uid) return () => {};
  const key = draftKey(uid, (isExam ? "x_" : "q_") + item.id);
  const cards = Array.from(document.querySelectorAll(".sq-card"));
  const submitCard = document.getElementById("sq-submit-card");
  const back = document.querySelector(".u-mb10px");
  if (!cards.length || !submitCard) return () => {};
  let timer = null, idx = 0, start = 0, done = false;
  const bar = document.createElement("div");
  bar.className = "exm-bar"; bar.innerHTML = '<span class="exm-t">⏱ <b id="exm-clock">--:--</b></span><span id="exm-pos"></span>';
  const intro = document.createElement("div");
  intro.className = "card center exm-intro";
  const stop = () => { clearInterval(timer); window.removeEventListener("beforeunload", warn); window.removeEventListener("hashchange", stop); bar.remove(); };
  const warn = (e) => { if (!done) { e.preventDefault(); e.returnValue = ""; } };
  const save = () => { if (!done) store.set(key, makeDraft(start, idx, gather())); };
  const finish = async (force) => {
    if (done) return;
    done = true; clearInterval(timer);
    const ok = await submit(force);
    if (ok) { store.del(key); stop(); } else { done = false; if (!force) timer = setInterval(tick, 500); }
  };
  const tick = () => {
    const left = remainingMs(start, Date.now(), minutes);
    const c = document.getElementById("exm-clock");
    if (c) { c.textContent = fmtClock(left); bar.classList.toggle("low", left <= 60000); }
    if (left <= 0) finish(true);
  };
  const show = () => {
    cards.forEach((c, i) => { c.style.display = i === idx ? "" : "none"; });
    const last = idx === cards.length - 1;
    submitCard.style.display = last ? "" : "none";
    nextBtn.style.display = last ? "none" : "";
    nextBtn.textContent = "السؤال التالي ←";
    document.getElementById("exm-pos").textContent = "سؤال " + (idx + 1) + " من " + cards.length;
  };
  const nextBtn = document.createElement("button");
  nextBtn.type = "button"; nextBtn.className = "btn"; nextBtn.style.cssText = "display:block;margin:12px auto;min-width:220px;";
  nextBtn.onclick = () => { idx = Math.min(idx + 1, cards.length - 1); save(); show(); window.scrollTo(0, 0); };
  const begin = (draft) => {
    start = draft ? draft.start : Date.now(); idx = draft ? draft.idx : 0;
    if (draft) restore(questions, draft.given);
    intro.remove(); document.body.appendChild(bar);
    if (back) back.style.display = "none";
    cards[cards.length - 1].insertAdjacentElement("afterend", nextBtn);
    show(); save();
    document.querySelector(".sq-card").parentNode.addEventListener("change", save);
    document.querySelector(".sq-card").parentNode.addEventListener("input", save);
    window.addEventListener("beforeunload", warn); window.addEventListener("hashchange", stop);
    timer = setInterval(tick, 500); tick();
  };
  const draft = parseDraft(store.get(key), questions.length);
  cards.forEach((c) => { c.style.display = "none"; }); submitCard.style.display = "none";
  const sc = document.getElementById("sq-submit"); const orig = sc.onclick;
  sc.onclick = () => finish(false);
  if (draft) { begin(draft); return stop; }
  intro.innerHTML = '<div class="u-fs44px">⏱</div><h2 style="margin:8px 0;">وضع الامتحان</h2><p class="muted" style="line-height:1.9;">المدة <b>' + cleanMinutes(minutes) + ' دقيقة</b> · ' + questions.length + ' سؤال.<br>هتشوف سؤال واحد في المرة ومش هتقدر ترجع للسؤال اللي فات.<br>إجاباتك بتتحفظ لوحدها، ولو الوقت خلص بيتسلّم تلقائي.</p><button type="button" class="btn" id="exm-go" style="min-width:200px;">ابدأ دلوقتي</button>';
  cards[0].insertAdjacentElement("beforebegin", intro);
  document.getElementById("exm-go").onclick = () => begin(null);
  void orig;
  return stop;
}
