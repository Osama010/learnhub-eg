/* مقبض Firebase (Auth + Firestore). الـ infrastructure هو المالك، والتهيئة بتتم من core/session.initFirebase. */
export let fbAuth = null;
export let fbDb = null;
export function openFirebaseClient(config) {
  firebase.initializeApp(config);
  fbAuth = firebase.auth();
  fbAuth.languageCode = "ar"; // إيميلات التفعيل واسترجاع الباسورد توصل بالعربي
  fbDb = firebase.firestore();
}
