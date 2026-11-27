/* اختبار التصدير: كاتب xlsx والجداول. بيكتب ملف حقيقي في /tmp/t4k-test.xlsx عشان نفتحه بمكتبة خارجية. */
const fs = require("fs"), path = require("path");
const rd = (f) => fs.readFileSync(path.join(__dirname, "../src/" + f), "utf8").replace(/export /g, "");
const X = new Function(rd("domain/xlsx.js") + "; return { crc32, colName, sheetName, buildXlsx };")();
const P = new Function(rd("features/teacher/export.presenter.js") + "; return { exportStudentsRows, exportGradesRows, exportFileName };")();
let n = 0; const eq = (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) { console.error("FAIL " + msg + ": " + JSON.stringify(a) + " != " + JSON.stringify(b)); process.exit(1); } n++; };
eq(X.crc32(new TextEncoder().encode("123456789")), 0xcbf43926, "crc32 standard vector");
eq([X.colName(0), X.colName(25), X.colName(26), X.colName(701), X.colName(702)], ["A", "Z", "AA", "ZZ", "AAA"], "column names");
const used = new Set();
eq([X.sheetName("a/b:c", used), X.sheetName("a b c", used), X.sheetName("", used), "x".repeat(40).length && X.sheetName("x".repeat(40), new Set()).length], ["a b c", "a b c 2", "Sheet", 31], "sheet names safe + unique + <=31");
const students = [{ id: "s1", name: "سارة", grade: "الأول", status: "approved", phone: "010" }, { id: "s2", name: "علي =cmd", grade: "الأول", status: "pending" }];
const gr = P.exportGradesRows({ students, quizzes: [{ id: "q1", title: "ك1" }], exams: [{ id: "e1", title: "ام" }], attempts: [{ studentId: "s1", quizId: "q1", score: 3, total: 4 }, { studentId: "s1", examId: "e1", score: 1, total: 2 }] });
eq(gr, [["الاسم", "الصف", "كويز: ك1", "امتحان: ام", "المتوسط %"], ["سارة", "الأول", 75, 50, 63], ["علي =cmd", "الأول", "—", "—", "—"]], "grades table");
eq(P.exportStudentsRows(students)[1][2], "مقبول", "status label");
const bytes = X.buildXlsx([{ name: "الطلاب", rows: P.exportStudentsRows(students) }, { name: "الدرجات", rows: gr }, { name: "خاص", rows: [["a<b&c", "\u0001bad", 5]] }]);
eq([bytes[0], bytes[1]], [0x50, 0x4b], "zip magic");
fs.writeFileSync("/tmp/t4k-test.xlsx", Buffer.from(bytes));
console.log("export:" + n + " passed");
