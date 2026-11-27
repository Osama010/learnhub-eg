/* Presenter تقرير ولي الأمر: بيجمع أرقام طالب واحد ويبني نص الواتساب. صافي. */
import { stageOfGrade } from "../../domain/student.js";
import { attemptPct } from "../../domain/quiz.js";
import { inactTs, lastActiveOf, daysSinceActive, inactLabel } from "./follow.presenter.js";
import { weakAreas } from "../../domain/weak-points.js";
import { normMode } from "./recipient.presenter.js";

const prepAvg = (xs) => (xs.length ? Math.round(xs.reduce((s, v) => s + v, 0) / xs.length) : null);
const prepDate = (d) => (d ? d.toLocaleDateString("ar-EG") : "—");

/** نموذج التقرير: أرقام الكويزات والامتحانات وآخر نشاط وآخر محاولات واللي لسه ما اتحلش. */
/** مستوى الطالب من متوسط كل محاولاته (بدون بيانات = null). */
export function levelLabel(avg) { return avg == null ? null : avg >= 85 ? "ممتاز" : avg >= 65 ? "جيد" : avg >= 50 ? "مقبول" : "محتاج دعم"; }

export function buildParentReport({ student, attempts, quizzes, exams, lessons, now }) {
  const mine = (attempts || []).filter((a) => a.studentId === student.id);
  const title = {}; (quizzes || []).forEach((q) => { title["q" + q.id] = q.title || "كويز"; }); (exams || []).forEach((e) => { title["e" + e.id] = e.title || "امتحان"; });
  const key = (a) => (a.quizId ? "q" + a.quizId : a.examId ? "e" + a.examId : "");
  const quizAtt = mine.filter((a) => a.quizId), examAtt = mine.filter((a) => a.examId);
  const stage = stageOfGrade(student.grade);
  const done = new Set(mine.map(key));
  const forMe = (c, p) => (c || []).filter((x) => x.stage === stage && (!x.grade || x.grade === student.grade) && !done.has(p + x.id));
  const last = lastActiveOf(student, mine);
  const n = daysSinceActive(last, now);
  const recent = mine.slice().sort((a, b) => ((inactTs(b) || 0) - (inactTs(a) || 0))).slice(0, 5)
    .map((a) => ({ title: title[key(a)] || (a.quizId ? "كويز" : "امتحان"), kind: a.quizId ? "كويز" : "امتحان", pct: attemptPct(a), date: prepDate(inactTs(a)) }));
  const weekAgo = new Date(now).getTime() - 7 * 86400000;
  const wk = mine.filter((a) => { const t = inactTs(a); return t && t.getTime ? t.getTime() >= weekAgo : Number(t) >= weekAgo; });
  const weak = weakAreas({ attempts: mine, quizzes, exams, lessons }).filter((w) => w.level === "weak").slice(0, 3).map((w) => w.label + " (" + w.pct + "%)");
  const allAvg = prepAvg(mine.map(attemptPct));
  return {
    weekCount: wk.length, weekAvg: prepAvg(wk.map(attemptPct)), weak, levelName: levelLabel(allAvg),
    name: student.name || "", grade: student.grade || "", level: student.level || null,
    quizCount: quizAtt.length, examCount: examAtt.length,
    quizAvg: prepAvg(quizAtt.map(attemptPct)), examAvg: prepAvg(examAtt.map(attemptPct)),
    lastLabel: inactLabel(n), lastDays: n, recent,
    missed: forMe(quizzes, "q").map((q) => q.title || "كويز").concat(forMe(exams, "e").map((e) => e.title || "امتحان")).slice(0, 8),
    date: prepDate(now),
  };
}

/** نص واتساب مختصر للتقرير حسب المستلم. */
export function parentReportText(rep, mode, teacherName) {
  const parent = normMode(mode) === "parent";
  const who = parent ? rep.name : "إنت";
  const L = [];
  L.push(parent ? "أهلاً بحضرتك، تقرير متابعة " + rep.name + (rep.grade ? " (" + rep.grade + ")" : "") + " بتاريخ " + rep.date + ":" : "أهلاً " + rep.name + "، ده تقرير متابعتك بتاريخ " + rep.date + ":");
  L.push("• الكويزات: " + (rep.quizCount ? rep.quizCount + " محاولة، المتوسط " + rep.quizAvg + "%" : "لسه ما حلش كويزات"));
  L.push("• الامتحانات: " + (rep.examCount ? rep.examCount + " محاولة، المتوسط " + rep.examAvg + "%" : "لسه ما حلش امتحانات"));
  if (rep.levelName) L.push("• المستوى العام: " + rep.levelName);
  L.push("• الأسبوع ده: " + (rep.weekCount ? rep.weekCount + " محاولة، المتوسط " + rep.weekAvg + "%" : "مفيش محاولات الأسبوع ده"));
  L.push("• آخر دخول: " + rep.lastLabel);
  if (rep.weak.length) L.push("• محتاج مراجعة: " + rep.weak.join("، "));
  if (rep.missed.length) L.push("• لسه ما اتحلش: " + rep.missed.join("، "));
  L.push(parent ? "نتمنى له التوفيق. " + (teacherName ? "مع تحياتي، مدرس " + teacherName : "") : "بالتوفيق يا " + who + "! " + (teacherName ? "— مدرسك " + teacherName : ""));
  return L.join("\n").trim();
}
