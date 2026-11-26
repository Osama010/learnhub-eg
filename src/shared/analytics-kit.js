import { T, getText } from "../core/templates.js";
import { esc } from "../core/utils.js";

/* ======= أدوات مشتركة لداشبوردات التحليل ======= */
// نص الـ CSS بيتحمّل مرة واحدة من analytics-kit.css وبيتحط كمان جوه صفحات الطباعة
export const AN_CSS = getText("src/shared/analytics-kit.css");
export const anPct = (a) => (a.total > 0 ? (a.score / a.total) * 100 : 0);
export const anTs = (a) => { const t = a && (a.updatedAt || a.ts || a.createdAt); return t && t.toDate ? t.toDate() : null; };
export const anAvg = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null);

export function anTrendSvg(trend) {
  const pts = trend.map((t, i) => ({ x: 20 + i * (320 / Math.max(1, trend.length - 1)), y: t.v === null ? null : 100 - t.v * 0.8, v: t.v, l: t.label }));
  const line = pts.filter((p) => p.y !== null);
  if (line.length < 2) return T("app.anTrendSvg");
  return T("app.anTrendSvg_2", { esc, line, pts });
}
export function anBandsSvg(b) {
  const mx = Math.max(1, ...b), cols = ["#ef4444", "#f59e0b", "#0d9488", "#0d9488"];
  return T("app.anBandsSvg", { b, cols, mx });
}

