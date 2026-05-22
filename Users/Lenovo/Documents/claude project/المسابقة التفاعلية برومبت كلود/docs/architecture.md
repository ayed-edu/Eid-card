# معمارية المشروع

## ملفات JS — وظيفة كل ملف

| الملف | الوظيفة |
|-------|---------|
| `app.js` | المتحكم الرئيسي: التنقل بين الشاشات، تهيئة التطبيق، ربط الوحدات |
| `app-config.js` | الثوابت والإعدادات العامة (اسم التطبيق، مفاتيح localStorage، الإصدار) |
| `data-subjects.js` | تعريف المواد الدراسية (لغتي، الرياضيات) |
| `data-units.js` | تعريف الوحدات والأسئلة النموذجية لكل مادة |
| `audio-engine.js` | توليد الأصوات عبر Web Audio API (بدون ملفات صوتية خارجية) |
| `session-persistence.js` | حفظ واستعادة حالة المسابقة من localStorage |
| `keyboard-shortcuts.js` | معالجة اختصارات لوحة المفاتيح |
| `screen-setup.js` | منطق شاشة الإعداد الأولي |
| `screen-classes.js` | منطق شاشة اختيار الفصل |
| `screen-add-students.js` | منطق شاشة إضافة الطلاب |
| `screen-class-students.js` | منطق شاشة عرض/تعديل قائمة الطلاب |
| `screen-subjects.js` | منطق شاشة اختيار المادة |
| `screen-units.js` | منطق شاشة اختيار الوحدة |
| `screen-quiz-settings.js` | منطق شاشة إعدادات المسابقة |
| `screen-question.js` | المنطق الرئيسي للمسابقة (الأكبر والأهم) |
| `screen-winner.js` | منطق شاشة إعلان الفائز |
| `screen-results.js` | منطق شاشة النتائج والتصدير |

## التدفق الرئيسي

```
setup → classes → add-students/class-students → subjects → units → quiz-settings → question → winner → results
```

## ملفات أخرى

| الملف | الوظيفة |
|-------|---------|
| `index.html` | الهيكل الكامل — جميع الشاشات مُضمّنة (display:none/flex) |
| `css/styles.css` | 4286 سطر — كل التصميم |
| `libs/anime.min.js` | مكتبة الأنيميشن Anime.js v4 |

## نمط العمل

- كل شاشة = ملف JS مستقل يُصدّر دوال مُهيِّئة
- `app.js` يستورد ويربط كل الشاشات
- لا يوجد framework — vanilla JS بالكامل
- التواصل بين الشاشات عبر `window.appState` (الحالة العامة)
