/* بوابة الطالب: أنهي شاشة تتعرض حسب الدور والبروفايل. */
export function studentGateView({ role, profile }) {
  if (role === "blocked") return { view: "blocked", suspended: !!(profile && profile.status === "suspended"), status: profile && profile.status };
  if (role === "unknown") return { view: "unknown" };
  if (!((profile || {}).parentPhone)) return { view: "parent-phone" };
  return { view: "dashboard" };
}
