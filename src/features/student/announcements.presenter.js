/* إعلانات الطالب: من غير المدرس الموقوف عنه، الأحدث الأول. */
export function studentAnnouncements({ data, rules: { visible, suspended } }) {
  return (data.ann || []).filter((a) => visible(a) && !suspended().has(a.teacherId))
    .sort((a, b) => (b.createdAt && a.createdAt ? b.createdAt.seconds - a.createdAt.seconds : 0));
}
