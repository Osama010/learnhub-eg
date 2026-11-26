/* Presenter غلاف لوحة الأدمن: بناء السجل والدفعات، مزامنة النسخة العامة، تحديد التاب (دوال صافية). */

const ADMIN_TABS = ["teachers", "students", "subjects", "library", "reports", "analytics", "log", "admins", "profile", "transfer"];
/** التاب من الـ hash (الافتراضي stats). */
export function adminTabOf(h) { const t = ADMIN_TABS.find((x) => h === "#/admin/" + x); return t || "stats"; }

/** مستند حركة في سجل الأدمن (by و at بيتحقنوا). */
export function buildLogEntry({ action, targetType, targetId, targetName, details, by, at }) {
  return { action, targetType: targetType || "", targetId: targetId || "", targetName: targetName || "", details: details || "", by, at };
}

/** مستند دفعة اشتراك. */
export function buildPaymentDoc({ teacher: t, sub: subData, note, paidAt, recordedBy }) {
  return {
    teacherId: t.id, teacherName: t.name || "",
    subType: subData.subType, amount: Number(subData.subAmount) || 0,
    from: subData.subStart || null, to: subData.subEnd || null,
    note: note || "",
    paidAt,
    recordedBy,
  };
}

/** ترتيب المواد حسب المرحلة (ابتدائي، إعدادي، ثانوي). */
export function sortSubjectsByStage(subjects) {
  const stageOrder = { "ابتدائي": 0, "إعدادي": 1, "ثانوي": 2 };
  return subjects.slice().sort((a, b) => (stageOrder[a.stage] ?? 9) - (stageOrder[b.stage] ?? 9));
}

/** خطة مزامنة النسخة العامة للمدرسين: {creates:[{id,data}], fixes:[{id,fix}]}. */
export function planPublicSync(teachers, pubs) {
  const pubMap = {};
  pubs.forEach((p) => { pubMap[p.id] = p; });
  const creates = [], fixes = [];
  (teachers || []).forEach((t) => {
    const p = pubMap[t.id];
    const av = t.avatar || t.photoData || "";
    if (!p) {
      creates.push({ id: t.id, data: {
        name: t.name || "", subject: t.subject || "", stages: t.stages || [],
        email: (t.email || "").toLowerCase(), avatar: av, active: t.active !== false,
        subType: t.subType || "free", subEnd: t.subEnd || null,
      } });
    } else {
      const fix = {};
      if ((p.email || "") !== (t.email || "").toLowerCase()) fix.email = (t.email || "").toLowerCase();
      if ((p.avatar || "") !== av) fix.avatar = av;
      if ((p.subType || "free") !== (t.subType || "free")) fix.subType = t.subType || "free";
      const pEnd = p.subEnd && p.subEnd.toMillis ? p.subEnd.toMillis() : null;
      const tEnd = t.subEnd && t.subEnd.toMillis ? t.subEnd.toMillis() : null;
      if (pEnd !== tEnd) fix.subEnd = t.subEnd || null;
      if (Object.keys(fix).length) fixes.push({ id: t.id, fix });
    }
  });
  return { creates, fixes };
}
