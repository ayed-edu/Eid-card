'use strict';
// build.js — يدمج index.html (CSS + JS مُضمَّن) داخل builder.html → builder-ready.html
const fs   = require('fs');
const path = require('path');

const DIR = __dirname; // qa-app/

function run() {
  // ─── قراءة الملفات الأصلية ───
  const builderSrc = fs.readFileSync(path.join(DIR, 'builder.html'), 'utf8');
  let   appHtml    = fs.readFileSync(path.join(DIR, 'index.html'),   'utf8');

  let cssCount = 0;
  let jsCount  = 0;

  // ─── تضمين CSS (link → style) ───
  appHtml = appHtml.replace(
    /<link\b[^>]*\bhref="([^"]*\.css)"[^>]*\/?>/g,
    (_, href) => {
      const css = fs.readFileSync(path.join(DIR, href), 'utf8');
      cssCount++;
      console.log(`  CSS: ${href}`);
      return `<style>\n${css}\n</style>`;
    }
  );

  // ─── تضمين JS (script src → inline) ───
  appHtml = appHtml.replace(
    /<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g,
    (_, src) => {
      const js = fs.readFileSync(path.join(DIR, src), 'utf8');
      jsCount++;
      console.log(`  JS:  ${src}`);
      return `<script>\n${js}\n</script>`;
    }
  );

  // ─── تهريب المحتوى للاستخدام داخل template literal ───
  const escaped = appHtml
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${')
    .replace(/<\/script/gi, '<\\/script') // منع المتصفح من إنهاء كتلة <script> مبكراً
    .replace(/<\/body>/gi,  '<\\/body>')  // منع live-reload من الحقن داخل الـ template
    .replace(/<\/html>/gi,  '<\\/html>'); // نفس السبب

  // ─── حقن القالب داخل builder ───
  if (!builderSrc.includes('__APP_TEMPLATE_PLACEHOLDER__')) {
    console.error('❌ لم يُعثر على __APP_TEMPLATE_PLACEHOLDER__ في builder.html');
    process.exit(1);
  }
  let output = builderSrc.replace('__APP_TEMPLATE_PLACEHOLDER__', escaped);

  // ─── حذف ملاحظة "وضع المعاينة فقط" (لم تعد ملائمة في النسخة الجاهزة) ───
  output = output.replace(
    /<div class="info-note" id="template-note">[\s\S]*?<\/div>/,
    ''
  );

  // ─── كتابة الناتج ───
  const outPath = path.join(DIR, 'builder-ready.html');
  fs.writeFileSync(outPath, output, 'utf8');

  const sizeKB = Math.round(Buffer.byteLength(output, 'utf8') / 1024);
  console.log('');
  console.log(`✅ builder-ready.html أُنشئ بنجاح`);
  console.log(`   CSS: ${cssCount} ملف | JS: ${jsCount} ملف | الحجم: ${sizeKB} KB`);
}

run();
