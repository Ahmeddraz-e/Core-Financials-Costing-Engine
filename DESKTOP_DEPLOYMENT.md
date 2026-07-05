# 💻 دليل تشغيل وتغليف تطبيق LODing ERP على الأجهزة كبرنامج ويندوز مستقل (.EXE)
## 💻 LODing ERP Desktop Compilation & Licensing Deployment Guide

مرحباً بك يا عماد! لقد قمنا بتهيئة التطبيق بالكامل ليتحول إلى تطبيق سطح مكتب حقيقي يعمل على نظام Windows باستخدام **Electron.js** مع دمج حماية فائقة تمنع أي جهاز غريب من تشغيل التطبيق إلا بعد إدخال كود تفعيل معتمد منك شخصياً.

---

## 🌟 الميزات المضافة حديثاً لحماية البرنامج وتغليفه
1. **تغليف Electron.js للمشروع**: قمنا بإعداد ملف تشغيل رئيسي `electron.cjs` يقوم بتشغيل قاعدة البيانات والسيرفر المحلي في الخلفية وفتح نافذة تطبيق جميلة وبمظهر SaaS احترافي وخفيف.
2. **بصمة الجهاز التعريفية (Hardware ID)**: يقوم البرنامج بإنشاء كود تعريف فريد لكل جهاز كمبيوتر يُفتح عليه البرنامج لأول مرة (مثال: `LOD-1234-5678-EMAD`).
3. **مولد أكواد التفعيل المدمج لك (للمالك عماد العربي)**: أضفنا لك في القائمة الجانبية قسماً خاصاً باسم **"تراخيص وتنشيط البرمجية" (Software License Keys)** يحتوي على مولد مشفر للأكواد. يمكنك كتابة معرف جهاز عميلك وسيقوم النظام فوراً بتوليد شفرة التنشيط الخاصة بجهازه لترسلها له.
4. **المفتاح الرئيسي الدائم (Master Bypass)**: قمنا بحفظ كود تفعيل رئيسي دائم لاستخدامه في الحالات الطارئة على أي جهاز: `LODING-EMAD-2026-ERP-ACTIVE`.

---

## 🚀 الخطوات العملية لتشغيل وتغليف البرنامج على جهازك

### 1️⃣ المتطلبات الأساسية على جهاز الكمبيوتر الخاص بك
قبل البدء، تأكد من تثبيت بيئة **Node.js** على جهازك (يفضل إصدار 18 أو أحدث). يمكنك تحميله مجاناً من الموقع الرسمي: [nodejs.org](https://nodejs.org).

### 2️⃣ تحميل كود المشروع على جهازك
لتنزيل كود هذا البرنامج على حاسوبك، اذهب إلى قائمة الإعدادات في واجهة AI Studio ثم اختر **Export to ZIP** لتحميل ملف المشروع مضغوطاً بالكامل على جهازك، ثم قم بفك الضغط عنه.

### 3️⃣ تثبيت المكونات (Dependencies)
افتح موجه الأوامر (Terminal أو Command Prompt) في مجلد المشروع الذي قمت بفك ضغطه، واكتب الأمر التالي لتثبيت كافة المكتبات (بما فيها Electron ومولد الحزم):
```bash
npm install
```

### 4️⃣ تشغيل البرنامج محلياً كبرنامج سطح مكتب (بيئة التطوير)
لتشغيل البرنامج وتجربة نافذة سطح المكتب فوراً على جهازك قبل عملية التغليف النهائية، استخدم الأمر:
```bash
npm run build && npm run electron:start
```
سيفتح لك البرنامج فوراً كبرنامج مستقل على جهازك!

### 5️⃣ تغليف وتوليد ملف ويندوز مستقل (.EXE) جاهز للتثبيت والإرسال
لتحويل كامل المشروع (الواجهات + السيرفر + قاعدة البيانات المحلية + الأكواد) إلى ملف واحد محمول جاهز للعمل على أي نظام ويندوز، قم بكتابة الأمر التالي:
```bash
npm run electron:dist
```

**ماذا سيحدث بعد تنفيذ هذا الأمر؟**
- سيقوم النظام ببناء المشروع ودمجه معاً.
- سيقوم بإنشاء مجلد جديد في جذر المشروع باسم **`dist-electron`**.
- ستجد داخل هذا المجلد ملفاً تنفيذياً للويندوز باسم **`LODing ERP System.exe`** (نسخة محمولة Portable تعمل فوراً دون الحاجة لتثبيت مسبق!).

---

## 🔑 كيف تعمل منظومة الأمان وحماية حقوقك كمالك ومطور؟

عندما تقوم بإرسال ملف الـ **`LODing ERP System.exe`** إلى أي عميل جديد لتثبيته على جهازه، ستحدث الخطوات التالية بالترتيب:

1. **ظهور شاشة التفعيل الفورية**: عند فتح البرنامج لأول مرة، سيتم حظر الدخول تماماً وستظهر شاشة تطلب "شفرة التفعيل".
2. **الحصول على كود بصمة جهاز العميل**: سيظهر للعميل كود فريد خاص بجهازه (مثال: `LOD-5982-1402-EMAD`). سيقوم العميل بنسخ الكود وإرساله لك (المالك عماد العربي).
3. **توليد شفرة التنشيط**:
   - قم بفتح البرنامج على جهازك الخاص من قسيمتك المفعلة.
   - اضغط على التبويب الجديد في القائمة الجانبية: **تراخيص وتنشيط البرمجية (Software License Keys)**.
   - في قسم المالك (لوحة تحكم عماد العربي)، قم بلصق كود جهاز العميل واضغط على **"توليد شفرة التفعيل الفورية للعميل"**.
   - سيقوم البرنامج فوراً بتوليد الكود المشفر المناسب لجهازه فقط (مثال: `EMAD-5982-1402-ACTIVE`).
   - قم بنسخ هذا الكود وإرساله للعميل.
4. **تنشيط البرنامج مدى الحياة**: عندما يكتب العميل الكود الذي أرسلته له ويضغط على "تنشيط"، سيفتح البرنامج بالكامل وتتخزن حالة التفعيل على قرصه الصلب مدى الحياة، ولن يطالبه بالرمز مجدداً أبداً!

---
---

# 💻 LODing ERP Desktop Compilation & Licensing Deployment Guide (English)

Welcome, Emad! We have configured the full Express + Vite stack to be packaged as a professional offline desktop suite for Windows using **Electron.js**, complete with hardware-bound license verification.

---

## 🌟 Newly Added Features for Software Packaging & Security
1. **Electron.js Wrapper Setup**: Added a main controller file `electron.cjs` that launches the local server and data.json state manager in the background and opens a clean, native, borderless browser frame.
2. **Machine Hardware ID Signatures**: Generates a deterministic, machine-specific Hardware ID upon first load (e.g., `LOD-9182-4103-EMAD`).
3. **Built-in Licensing Generator Panel (Emad Elarapy Only)**: Located in the sidebar menu as **"Software License Keys"**. Paste your client's Hardware ID into this panel on your authorized PC to generate a client-bound license key instantly.
4. **Master Key Bypass**: Emergency override key for any installation: `LODING-EMAD-2026-ERP-ACTIVE`.

---

## 🚀 Step-by-Step Desktop Build Instructions

### 1️⃣ Prerequisite Setup
Ensure that **Node.js** (v18 or newer) is installed on your computer. Download it from the official website if needed: [nodejs.org](https://nodejs.org).

### 2️⃣ Download the Project Code
Go to the **Settings** menu in the top right of this AI Studio screen, select **Export to ZIP** to download the complete source code, and extract it onto your hard drive.

### 3️⃣ Install Modules
Open your Terminal or Command Prompt, navigate to the extracted directory, and run:
```bash
npm install
```

### 4️⃣ Launch the App locally in Desktop Frame
Run the following script to test the desktop experience locally prior to packaging:
```bash
npm run build && npm run electron:start
```

### 5️⃣ Package Into a Windows Single Standalone Portable executable (.EXE)
Compile and build the complete app package by executing:
```bash
npm run electron:dist
```

**Where is the executable saved?**
After completion, a folder named **`dist-electron`** will be generated. Inside it, you will find **`LODing ERP System.exe`**. This is a self-contained portable executable. You can distribute this single file to anyone, and it will run instantly with its standalone database, backup utilities, and copy protection.

---

## 🔑 Client Deployment Workflow & Licensing Process

1. **Initial Lock Screen**: When a client runs `LODing ERP System.exe` on their computer for the first time, the program locks down and displays the Activation Screen.
2. **Obtaining Hardware ID**: The client copies their unique Hardware ID (e.g., `LOD-5982-1402-EMAD`) and sends it to you (the owner, Emad Elarapy).
3. **Generating Activation Code**:
   - Open LODing ERP on your computer.
   - Go to **"Software License Keys"** (تراخيص وتنشيط البرمجية) in the sidebar.
   - Paste the client's Hardware ID inside the generator form and click **"Generate Secure Activation Code"**.
   - Copy the customized key that is printed (e.g., `EMAD-5982-1402-ACTIVE`) and send it back to the client.
4. **Permanent Activation**: Once the client enters this code, their computer is permanently authorized. The software stores this activation status in their local client state, and they will never be prompted for it again.
