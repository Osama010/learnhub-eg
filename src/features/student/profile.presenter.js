/* حسابي (الطالب): نموذج عرض الصورة الشخصية. */
export function avatarModel(profile) {
  const av = (profile && profile.avatar) || "";
  const nm = ((profile && profile.name) || "").trim();
  return { av, nm, hasPhoto: !!av };
}
