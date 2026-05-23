# البنية التقنية

## نوع التطبيق

Static Web App.

## الاستضافة

GitHub Pages.

## لا يوجد

- Backend.
- قاعدة بيانات.
- تسجيل دخول.
- API خارجي إلزامي.

## البنية المقترحة للملفات

```text
/
├── index.html
├── README.md
├── CLAUDE.md
├── docs/
│   ├── project-brief.md
│   ├── product-requirements.md
│   ├── ui-rules.md
│   ├── data-contracts.md
│   ├── architecture.md
│   ├── tasks.md
│   ├── status.md
│   ├── known-issues.md
│   └── design-workflow.md
├── src/
│   ├── styles.css
│   ├── app.js
│   ├── templates.js
│   ├── export-image.js
│   └── share.js
└── assets/
    ├── fonts/
    └── templates/
```

## خيار ملف واحد

إذا كان الهدف سرعة الإطلاق، يمكن بناء النسخة الأولى في ملف واحد:

```text
index.html
```

ويحتوي على CSS و JavaScript داخليًا. بعد نجاح النسخة الأولى يمكن فصل الملفات.

## التصدير

الخيار الأساسي:

- تصدير PNG من عنصر البطاقة.

خيارات تقنية مقبولة:

- html2canvas
- dom-to-image-more
- Canvas API مباشر

يفضل في البداية استخدام HTML/CSS/SVG بسيط لتقليل مشاكل التصدير.

## المشاركة

- استخدام Web Share API إن كانت متاحة.
- تمرير النص المخصص مع الصورة إن أمكن.
- توفير تحميل PNG كخيار احتياطي دائم.
- توفير نسخ نص التهنئة عند فشل المشاركة.
