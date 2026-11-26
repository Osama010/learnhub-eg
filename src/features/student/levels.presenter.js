/* مستوى الطالب: نسبة التقدم للمستوى اللي بعده. */
export function levelProgressPct(points, level) {
  return level.next ? Math.round(((points - level.cur.min) / (level.next.min - level.cur.min)) * 100) : 100;
}
