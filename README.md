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
- شاشات رفيعة من غير presenter (مفيهاش منطق): `student/library`, `student/lesson`, `student/profile`، وكمان `landing/landing.js` و`teacher/forms.js`.
- متغيرات الجلسة `fbUser/fbProfile/fbRole` لسه بتتستورد من `core/session.js` (live bindings) ومش متحقنة. `core/session.js` هو الاستثناء الوحيد اللي بيكلم Firebase Auth.
- لسه ما اتجربش على Firebase الحقيقي بعد الدخول.

### الاختبارات
- `check-b8..b16`: سلوك الشاشات (الاختبارات القديمة بنفس النتايج).
- `check-usecases.js`: الـ use cases على repositories في الذاكرة + عقود الـ ports + الـ presenters.
- `check-infra.js`: كل دوال الـ infrastructure على Firestore وهمي بيحاكي الـ SDK (`tests/lib/fake-firestore.js`)، ومعاه الـ use cases على تنفيذ Firebase الحقيقي. بيفشل لو دالة اتنسيت من الاختبار.

## رسالة لصف (الرسائل الجماعية)
- الشاشة: `src/features/teacher/bulk-message.js` + `bulk-message.html` (تاب "رسالة لصف" في لوحة المدرس، المسار `#/teacher/bulk`).
- المنطق الصافي في `bulk-message.presenter.js` (الاستهداف بالمرحلة/الصف، الرقم، {اسم}، الملخص). الشاشة بتقرأ طلاب المدرس من نفس `teacherLoad` من غير أي كتابة، فمفيش use case ولا تغيير في قواعد Firestore.
- الإرسال يدوي: زرار واتساب لكل ولي أمر (`waLink`). علامة "اتبعت" بتتحفظ في `localStorage` على الجهاز بس.
- الاختبارات: في `tests/check-usecases.js` (أقسام "رسالة لصف").
