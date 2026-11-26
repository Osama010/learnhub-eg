/* تحويل نتايج Firestore (snapshots) لكيانات عادية: الريبوزيتوري مبيرجّعش أنواع Firebase لبرّه. */
export const rows = (sn) => sn.docs.map((d) => ({ id: d.id, ...d.data() }));
export const one = (d) => (d.exists ? d.data() : null);
export const plain = (sn) => sn.docs.map((d) => d.data());
