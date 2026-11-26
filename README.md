# منصة المستر (Tech for Kids)

موقع تعليمي بـ HTML + CSS + JavaScript عادي (vanilla) ومعاه Firebase (Auth + Firestore). مفيش build ولا مكتبات تتسطب.

## التشغيل في VS Code
1. افتح الفولدر في VS Code.
2. ثبّت إضافة **Live Server** (Ritwick Dey).
3. كليك يمين على `index.html` ثم **Open with Live Server**، وافتح `http://localhost:5500`.
   (لازم http، مش دوبل كليك على الملف: الـ ES modules والـ Firebase بيحتاجوه.)
4. بعد أي تعديل اعمل Ctrl+Shift+R. لو لسه القديم ظاهر، غيّر `CACHE` في `sw.js` أو امسح الـ service worker من DevTools > Application.

> التشغيل المحلي بيكلم Firebase الحقيقي (مشروع tech-for-kids-d1706). جرّب بحساب تجريبي.

## الهيكل
```
index.html              صفحة الهبوط والدخول العام
student/ teacher/ admin/  بوابات الأدوار (index.html + portal.js + manifest)
src/                    كل شاشة/موديول صفحاته مع بعض: JS + قالب HTML (+ CSS) في نفس الفولدر
  main.js, boot.js      نقطة الدخول (تحميل القوالب ثم تشغيل التطبيق)
  core/                 session (فايربيز والأدوار), router, utils, templates (محرك القوالب), base.css
  features/
    auth/ about/ landing/
    student/ teacher/ admin/   مثال: features/student/home.js + home.html بجانب بعض
  domain/               قواعد العمل الصافية (اشتراكات، ترم، كويز، طالب، تقدّم...) من غير DOM ولا Firebase
  application/          use cases + ports (عقود الـ repositories) + DataGateway
  infrastructure/       firebase/ (التنفيذ الحقيقي) و memory/ (نسخة للاختبارات) و crypto.js
  main/                 composition root: compose.js بيركّب التنفيذ، data.js واجهة البيانات للشاشات
  shared/               مكونات (كل واحد معاه CSS بتاعه لو محتاج) مشتركة: مشغل الفيديو/PDF، الرسوم والتصدير، الثيم، التنبيهات ...
assets/ config/ vendor/ docs/   الصور، إعدادات فايربيز، pdf.js، قواعد Firestore
tests/                  اختبارات (node)
sw.js                   service worker
```

## القوالب
كل ملف `.html` جنب الـ `.js` بتاعه (مثلا `home.js` و `home.html`) فيه قوالب الشاشة، كل واحد يبدأ بسطر:
`<!-- @@ الاسم | متغير1,متغير2 -->` وبعده الـ HTML. الـ `${...}` بتتحسب وقت العرض.
في الكود: `T("الاسم", { متغير1, متغير2 })` بترجّع النص.

## إضافة شاشة جديدة
1. اعمل ملف في `src/features/<الدور>/` فيه دالة `renderXxx`.
2. اكتب الـ HTML في نفس الفولدر: `src/features/<الدور>/<الملف>.html` بقالب جديد، وناديه بـ `T()`.
3. سجّل المسار في `src/core/router.js`، وضيف الملف الجديد في `src/boot.js` لو مش مستورد من حتة تانية.
4. اسم القالب الجديد لازم يتضاف كمان في `src/templates.json` لو عملت ملف .html جديد، وضيف الملفات في قايمة `SHELL` في `sw.js` وغيّر اسم `CACHE`.

## إضافة شاشة بالعمارة الجديدة
ضيف `x.presenter.js` جنب `x.js` لأي منطق (فلترة، ترتيب، حسابات، بناء مستندات، تحقق)، وأي كتابة تعدّي على use case جديد في `application/usecases.js` + method في port مناسب في `ports.js` + تنفيذه في `infrastructure/firebase/repositories.js` و`infrastructure/memory/repositories.js`، وغطّيهم في `tests-src` (check-usecases و check-infra).

## الاختبارات
من جذر المشروع: `node -r ./tests/lib/legacy-fs.js tests/check-b15.js` (وباقي `check-b*.js`).

## القواعد (Firestore rules)
في `docs/firestore.rules`. لو اتغيرت لازم تتنشر من Firebase Console قبل رفع الموقع.

## الحالة المشتركة (state)

- حالة شاشة الدروس/الكويزات/الامتحانات عند المدرس متجمعة في كائن واحد `lessonsState` (features/teacher/lessons.js): `lessons, attempts, ratings, exams, quizzes, lessonForm, examForm, quizForm, ...`. بتتعدّل مباشرة: `lessonsState.lessonForm = ...` (مفيش دوال set_ تاني).
- حالة صفحة «عن المهندس» والجملة اللي في الأسفل في `aboutState` (features/about/about.js).
- ملفات الخدمات الوحيدة اللي بتكلم Firestore/Auth هي اللي في src/infrastructure/firebase/ (والاستثناء الوحيد core/session.js).

## العمارة (Clean Architecture)

الاعتماد بيروح لجوه بس: `features/shared → main → application → domain`، و`infrastructure → application/domain`.

| الطبقة | فيها إيه | مسموح تستورد من |
|---|---|---|
| `domain/` | قواعد صافية (دوال بمدخلات ومخرجات): اشتراكات، ترم، كويز، طالب، تقدّم، وتحديد الدور `role.js` | domain بس |
| `application/` | `usecases.js` (سيناريوهات: تسجيل، تغيير حالة، تعديل طالب مع نقل الفهرس، حفظ محاولة، إضافة/تعديل/إيقاف مدرس وتسجيل دفعة بدفعة ذرية، نقل، حذف شامل، ربط حساب، أول دخول، PIN المشرف، إدارة المواد/المكتبة/الإعدادات)، `ports.js` (العقود)، `data-gateway.js` | application, domain |
| `infrastructure/` | `firebase/` (repositories.js + دوال الوصول)، `memory/` (fakes للاختبار)، `crypto.js` | infrastructure, application, domain |
| `main/` | `compose.js` (الـ composition root)، `data.js` (واجهة بيانات مفوّضة بتتحقن)، `infra-data.js` | الكل |
| `features/`, `shared/` | الشاشات: controller (`x.js`) + presenter (`x.presenter.js`، صافي) + view (`x.view.js`، DOM بس) + القالب `.html` | domain, application (use cases/errors), main, core |

- الشاشات بتنادي `useCases.*` (من `main/compose.js`) للعمليات، ودوال القراءة من `main/data.js`. مبتستوردش `infrastructure/` ولا بتلمس `firebase.*` مباشرة.
- الـ presenter صافي: بياخد البيانات والقواعد (visible, term, locked...) كمدخلات ويرجّع نموذج العرض، من غير `document`/`window`/Firebase، وبيستورد من `domain/` وpresenters تانية بس.
- تحديد الدور (`core/session.js` > `resolveRole`) بيقرا من `main/data.js` (getAdmin, getTeacher, getStudent) والقرار في `domain/role.js`. مفيش `fbDb` برّه `infrastructure/`.
- أي تنفيذ جديد (مثلاً مخزن تاني) بيحقق نفس الـ ports ويتركّب في `main/compose.js` من غير ما الشاشات تتغير.
- المفروض ده كله بيتفحص تلقائي: `node tests/check-arch.js` (الاتجاهات + presenters صافية + مفيش firebase في الشاشات + الـ imports سليمة + sw.js).

### حدود معروفة
- `core/session.js` مابقاش بيكلم Firebase Auth: بيستخدم `openSession` و`onAuthChange` و`signOutUser` من `main/data.js` (جزء من DataGateway)، والتنفيذ في `infrastructure/firebase/auth.js`.
- العناصر المشتركة `closing` و`downloadBlob` و`statusChip` في `shared/common.js` وحالة النبذة في `shared/about-state.js`، فمفيش شاشة بتستورد من شاشة تانية.
- كل الشاشات ليها presenter ما عدا شاشات ربط DOM بس: `teacher/forms.js` و`admin/backup.js` و`teacher/quiz-editor.js`.
- محرر أسئلة الكويز اتفصل من `teacher/lessons.js` لـ `teacher/quiz-editor.js`.
- متغيرات الجلسة `fbUser/fbProfile/fbRole` لسه بتتستورد من `core/session.js` (live bindings) ومش متحقنة.
- لسه: `shared/pwa.js` و`shared/toast.js` و`core/session.js` بيستوردوا شاشات (الدخول/النبذة/PIN).

## رسالة لصف (الرسائل الجماعية)
- الشاشة: `src/features/teacher/bulk-message.js` + `bulk-message.html` (تاب "رسالة لصف" في لوحة المدرس، المسار `#/teacher/bulk`).
- المنطق الصافي في `bulk-message.presenter.js` (الاستهداف بالمرحلة/الصف، الرقم، {اسم}، الملخص). الشاشة بتقرأ طلاب المدرس من نفس `teacherLoad` من غير أي كتابة، فمفيش use case ولا تغيير في قواعد Firestore.
- الإرسال يدوي: زرار واتساب لكل ولي أمر (`waLink`). علامة "اتبعت" بتتحفظ في `localStorage` على الجهاز بس.
- الاختبارات: في `tests/check-usecases.js` (أقسام "رسالة لصف").

## اختيار المستلم (ولي الأمر / الطالب)
- `features/teacher/recipient.presenter.js` (الأرقام حسب الاختيار بالظبط، من غير بديل تلقائي) و`recipient.js` (الاختيار بيتحفظ على الجهاز في `t4k_wa_recipient`) و`recipient.html` (قايمة الاختيار). بتستخدمه رسالة لصف ومتابعة الطلاب وتقرير ولي الأمر.
- تذكير المتأخرين عن كويز/امتحان (`late-students`) لسه بنفس سلوكه القديم (ولي الأمر لو مسجل وإلا الطالب).

## متابعة الطلاب + تقرير ولي الأمر + شهادات + نسخة احتياطية
- تاب "متابعة الطلاب" (`#/teacher/follow`): المتأخرين عن النشاط (7/14/30 يوم) من `activityDays` وآخر محاولة، تذكير واتساب، وروابط التقرير والشهادة. الحساب في `follow.presenter.js`.
- تقرير ولي الأمر (`#/teacher/preport/<id>`): `parent-report.presenter.js`. واتساب نصي + طباعة/حفظ PDF من المتصفح.
- شهادة (`#/teacher/cert/<id>`): نموذج كل جزء فيه بيتعدل (العنوان، المقدمة، الاسم، الصف، النص، المدرس، المادة، التاريخ) مع معاينة حية، وأسباب جاهزة تملا النص. `certificate.presenter.js`. بتتعمل في المتصفح (طباعة A4 أفقي) ومش بتتحفظ على السيرفر.
- نسخة احتياطية: `backup.presenter.js` (بيشيل أي حقل شكله سر ويحوّل التواريخ). كارت للمدرس في تاب المتابعة (JSON كامل/CSV للطلاب) وكارت للأدمن في تاب السجل. تصدير للحفظ بس، مفيش استرجاع تلقائي، ومفيش ملفات الفيديو/PDF الكبيرة.
- كلهم قراءة فقط من بيانات المدرس/الأدمن المحمّلة: مفيش use cases جديدة ولا تغيير في قواعد Firestore.
- الاختبارات: `tests/check-usecases.js` (المنطق والقوالب) و`tests/check-b19.js` (الشاشات كاملة: رسم وأزرار وتبديل المستلم والتنزيل).
