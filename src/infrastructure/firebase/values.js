/* قيم التخزين الخاصة بـ Firestore: وقت السيرفر، التواريخ المخزّنة، مسح حقل. الشاشات بتطلبها من هنا (عبر DataGateway) بدل ما تلمس firebase مباشرة. */
export const serverNow = () => firebase.firestore.FieldValue.serverTimestamp();
export const toStoredTime = (date) => firebase.firestore.Timestamp.fromDate(date);
export const removeField = () => firebase.firestore.FieldValue.delete();
