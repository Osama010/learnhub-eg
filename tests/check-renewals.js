/* اختبار تنبيهات تجديد الاشتراك (دوال صافية من domain/subscription.js). */
const fs = require("fs"), path = require("path");
const src = fs.readFileSync(path.join(__dirname, "../src/domain/subscription.js"), "utf8").replace(/export /g, "");
const m = new Function(src + "; return { renewalAlerts, renewalMessage, RENEWAL_ALERT_DAYS };")();
let n = 0; const eq = (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) { console.error("FAIL " + msg + ": " + JSON.stringify(a) + " != " + JSON.stringify(b)); process.exit(1); } n++; };
const now = new Date("2026-11-27T10:00:00");
const dayOff = (d) => new Date(now.getTime() + d * 86400000);
const T = (name, subType, d) => ({ id: name, name, subType, subEnd: d == null ? null : dayOff(d), phone: "01000000000" });
const list = m.renewalAlerts([T("حر", "free", 1), T("بعيد", "monthly", 30), T("حدّ7", "monthly", 7), T("بعد8", "monthly", 8), T("بكرة", "term", 1), T("منتهي", "year", -3), T("بلا تاريخ", "monthly", null), T("اليوم", "monthly", 0)], now);
eq(list.map((a) => [a.teacher.name, a.daysLeft, a.expired]), [["منتهي", -3, true], ["اليوم", 0, false], ["بكرة", 1, false], ["حدّ7", 7, false]], "alerts: window, order, free/no-date skipped");
eq(m.renewalAlerts([T("x", "monthly", 14)], now, 15).length, 1, "custom window");
eq(m.renewalAlerts(null, now), [], "null safe");
const msg = list[0].message;
eq([msg.includes("انتهى يوم"), list[1].message.includes("النهارده"), list[2].message.includes("فاضل 1 يوم"), /ج\.م|جنيه|\d+\s*EGP/.test(msg)], [true, true, true, false], "messages, no invented prices");
eq(m.RENEWAL_ALERT_DAYS, 7, "7 days");
console.log("renewals:" + n + " passed");
