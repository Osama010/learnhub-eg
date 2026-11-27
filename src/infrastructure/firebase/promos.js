/* أكواد التجربة والخصم (collection: promoCodes): للأدمن بس. الكود هو اسم المستند. */
import { db } from "./db.js";
import { rows } from "./mapping.js";
export const listPromos = () => db.promoCodes().limit(200).get().then(rows);
export const getPromo = (code) => db.promoCodes().doc(code).get().then((s) => (s.exists ? { id: s.id, ...s.data() } : null));
export const savePromo = (code, data) => db.promoCodes().doc(code).set(data);
export const updatePromo = (code, patch) => db.promoCodes().doc(code).update(patch);
export const deletePromo = (code) => db.promoCodes().doc(code).delete();
export const bumpPromoUse = (code) => db.promoCodes().doc(code).update({ uses: firebase.firestore.FieldValue.increment(1) });
