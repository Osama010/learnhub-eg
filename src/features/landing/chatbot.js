import { openLoginModal } from "../auth/login.js";
import { supportWhatsAppUrl } from "../../shared/site-config.js";
import { ACTION_LABELS, GREETING, QUICK, answer } from "./chatbot.presenter.js";

/* ---------- مساعد الأسئلة الشائعة (قواعد كلمات مفتاحية، من غير سيرفر) ---------- */
export function setupChatbot() {
  try {
    const btn = document.getElementById("lp-chat-btn");
    if (!btn) return;
    let panel = null;
    const close = () => { if (panel) { panel.remove(); panel = null; } btn.setAttribute("aria-expanded", "false"); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    const add = (log, who, text, actions) => {
      const m = document.createElement("div");
      m.className = "cb-msg " + who;
      m.textContent = text;
      log.appendChild(m);
      if (actions && actions.length) {
        const row = document.createElement("div");
        row.className = "cb-acts";
        actions.forEach((a) => {
          let el;
          if (a === "wa") {
            const u = safeWa();
            if (!u) return;
            el = document.createElement("a"); el.href = u; el.target = "_blank"; el.rel = "noopener";
          } else { el = document.createElement("button"); el.type = "button"; el.onclick = () => run(a); }
          el.className = "cb-act" + (a === "wa" ? " wa" : "");
          el.textContent = ACTION_LABELS[a] || a;
          row.appendChild(el);
        });
        log.appendChild(row);
      }
      log.scrollTop = log.scrollHeight;
    };
    const run = (a) => {
      try {
        if (a === "register") { close(); location.hash = "#/register"; }
        else if (a === "teacher-request") { close(); location.hash = "#/teacher-request"; }
        else if (a.startsWith("login-")) { close(); openLoginModal(a.slice(6)); }
        else if (a === "install") { close(); const i = document.getElementById("lp-install"); if (i) { i.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(() => i.click(), 500); } }
      } catch (e) { console.warn("إجراء الشات مش شغال", e); }
    };
    const open = () => {
      if (panel) return close();
      panel = document.createElement("div");
      panel.className = "cb-panel";
      panel.setAttribute("role", "dialog");
      panel.setAttribute("aria-label", "مساعد المستر");
      panel.innerHTML = '<div class="cb-head"><div><b>🤖 مساعد المستر</b><small>مساعد آلي بيجاوب على الأسئلة الشائعة</small></div><button type="button" class="cb-x" aria-label="إغلاق">✕</button></div><div class="cb-log" aria-live="polite"></div><div class="cb-quick"></div><form class="cb-form" autocomplete="off"><input class="cb-in" type="text" placeholder="اكتب سؤالك..." maxlength="200"><button type="submit" class="cb-send">إرسال</button></form>';
      document.body.appendChild(panel);
      btn.setAttribute("aria-expanded", "true");
      const log = panel.querySelector(".cb-log"), quick = panel.querySelector(".cb-quick"), form = panel.querySelector(".cb-form"), inp = panel.querySelector(".cb-in");
      panel.querySelector(".cb-x").onclick = close;
      add(log, "bot", GREETING);
      const ask = (q) => {
        add(log, "me", q);
        const r = answer(q);
        setTimeout(() => { if (panel) add(log, "bot", r.text, r.actions); }, 250);
      };
      QUICK.forEach((q) => { const b = document.createElement("button"); b.type = "button"; b.className = "cb-q"; b.textContent = q; b.onclick = () => ask(q); quick.appendChild(b); });
      form.onsubmit = (e) => { e.preventDefault(); const q = inp.value.trim(); if (!q) return; inp.value = ""; ask(q); };
      setTimeout(() => { try { inp.focus(); } catch (_) {} }, 50);
    };
    btn.onclick = open;
    document.addEventListener("keydown", onKey);
    const gone = new MutationObserver(() => { if (!document.body.contains(btn)) { close(); document.removeEventListener("keydown", onKey); gone.disconnect(); } });
    gone.observe(document.getElementById("app") || document.body, { childList: true });
  } catch (e) { console.warn("الشات مش شغال", e); }
}
function safeWa() { try { return supportWhatsAppUrl(); } catch (_) { return ""; } }
