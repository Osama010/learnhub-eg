/* راجع غلطاتك: تجميع الغلطات حسب الاختبار. */
export function groupMistakes(mistakes) {
  const groups = [];
  for (const m of mistakes) {
    const key = (m.isExam ? "x" : "q") + m.item.id;
    let g = groups.find((x) => x.key === key);
    if (!g) { g = { key, item: m.item, isExam: m.isExam, list: [] }; groups.push(g); }
    g.list.push(m);
  }
  return { groups, total: groups.reduce((s, g) => s + g.list.length, 0) };
}
