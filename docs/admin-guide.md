# دليل المشرف — Admin Guide

> عربي أولًا · English below

---

## العربية

### ١) إنشاء برنامج (المشرف التنفيذي العام)

1. سجّل الدخول بحساب `exec@leqat.qa`.
2. من لوحة التحكم → **الجدول والمحطات** → إنشاء برنامج.
3. اختر النوع: **أسبوعي** (فصل ١٠ أسابيع) أو **يومي** (مخيم صيفي/ربيعي).
4. حدّد الفئة العمرية، البُعد المركزي (SQ / EQ / IQ / PQ)، القيمة
   (الإحسان / الانضباط / التعلّم / الصحة)، السعة، والسعر بالريال.
5. كل الحقول تُحفظ بالعربية (إلزامي) والإنجليزية (اختياري).

### ٢) تعيين الطاقم

1. افتح البرنامج → **الطاقم**.
2. عيّن: مشرف برنامج تنفيذي، مدير برنامج، مشرف مجموعة، مشرف مساعد.
3. الصلاحيات تُطبَّق على الخادم تلقائيًا عبر RLS — لا حاجة لإعداد يدوي.

### ٣) إنشاء المجموعات والمحطات

1. **الجدول والمحطات** → أضف مجموعة (السعة الافتراضية ١٥).
2. لكل جلسة، استخدم القالب الافتراضي (طابور → رياضة → نشاط رئيسي →
   قصة → حوافز) ثم عدّل المحطات: العنوان، المدة، المواد، البُعد،
   المهارة، القيمة، والكتاب المرتبط.
3. «نسخ خطة الأسبوع السابق» لتسريع الإعداد.

### ٤) استقبال أولياء الأمور

1. ولي الأمر ينشئ حسابًا من صفحة **التسجيل** العامة.
2. يضيف الأبناء → يختار البرنامج → يوافق على سياسة الصور والنموذج
   الطبي وجهات الطوارئ → يدفع.
3. **موافقة الصور افتراضيًا = لا** — لا تظهر صورة الطفل في أي منشور
   جماعي دون موافقة صريحة.

---

## English

### 1) Create a program (Executive Supervisor)

1. Log in as `exec@leqat.qa`.
2. Dashboard → **Schedule & Stations** → create program.
3. Choose type: **weekly** (10-week semester) or **daily** (camp).
4. Set age group, focus quotient (SQ/EQ/IQ/PQ), value, capacity,
   and QAR price. Arabic fields are required, English optional.

### 2) Assign staff

1. Open the program → **Staff**.
2. Assign Program Supervisor, Program Manager, Group Supervisor,
   Assistant Supervisor. Permissions are enforced server-side via
   Supabase RLS automatically.

### 3) Groups & stations

1. Add a group (default capacity 15).
2. Per session use the default template, then edit each station
   (title, duration, materials, quotient, skill, value, linked book).
3. Use "Clone last week's plan" to speed setup.

### 4) Onboard parents

1. Parent self-registers from the public **Register** page.
2. Adds children → picks program → consents to photo policy +
   medical form + emergency contacts → pays.
3. **Photo consent defaults to NO** — a child's photo never appears
   in any group-visible post without explicit consent.
