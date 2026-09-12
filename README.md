# Abjad Agi — WhatsApp AI Agent

وكيل واتساب ذكي ومستقل تماماً لشركة **أبجد** (Abjad Kitchen + Abjad Cashier).
مبني بـ **Node.js + TypeScript + Baileys** مع طبقة AI قابلة للتبديل (Anthropic / OpenAI).
**لا يعتمد على OpenClaw إطلاقاً.**

## المزايا
- ربط واتساب دائم (Linked Device) عبر Baileys، مع **إعادة اتصال تلقائية** وجلسة محفوظة (لا QR بعد كل Restart).
- **QR للربط عبر صفحة ويب** (`/qr`) — بدون الحاجة لترمنال.
- طبقة **AIProvider** مفصولة: بدّل بين Claude و OpenAI من `.env` بدون تعديل منطق واتساب.
- **System Prompt قابل للتعديل** في `prompts/system-prompt.txt` (شخصية Abjad Agi، لهجة عراقية).
- **Human Takeover**: أوامر `/pause` `/resume` `/status`، وإيقاف تلقائي عند رد المشرف يدوياً، مع انتهاء تلقائي.
- **ذاكرة محادثة** موفّرة للتكلفة: آخر N رسالة + ملخّص للمحادثات الطويلة.
- **مقاومة السبام والأعطال**: debounce، رد واحد لكل محادثة، retry + backoff، timeout، حد تزامن عام، graceful shutdown.
- **SQLite** (contacts, messages, processed_messages, conversation_state).
- **Health API** (`/health`, `/status`) + **log rotation**.
- **Docker** مستقل، non-root، volumes دائمة، بدون host network.

## المتطلبات
- Docker + Docker Compose على السيرفر.
- مفتاح API حقيقي (Anthropic أو OpenAI). *ملاحظة: اشتراك ChatGPT Plus أو Claude Pro ليس مفتاح API.*

---

## التشغيل السريع (سيرفر فيه نسخة الكود)
```bash
cp .env.example .env      # ثم عبّئ المفاتيح
docker compose up -d --build
docker compose logs -f
```
ثم افتح `http://<server-ip>:47850/qr?token=<PAIRING_TOKEN>` وامسح الـQR من واتساب الرقم المطلوب
(الأجهزة المرتبطة ← ربط جهاز).

## النشر عبر Hostinger hPanel (بدون ترمنال)
1. VPS → **Docker Manager** → **Compose**.
2. الصق محتوى [`deploy/hpanel-compose.yml`](deploy/hpanel-compose.yml) بعد استبدال `__REPO_URL__` برابط الريبو،
   وعبّئ `ANTHROPIC_API_KEY` و `PAIRING_TOKEN`.
3. Deploy → انتظر البناء.
4. افتح صفحة الـQR وامسح الكود.

---

## متغيّرات البيئة
كلها موثّقة في [`.env.example`](.env.example). الأسرار **فقط** في `.env` أو في محرر البيئة داخل hPanel — لا شيء في الكود.

## أوامر المشرف (تُكتب داخل محادثة العميل من واتساب الرقم نفسه)
| الأمر | الوظيفة |
|---|---|
| `/pause [دقائق]` | إيقاف رد AI لهذا العميل مؤقتاً |
| `/resume` | تفعيل رد AI فوراً |
| `/status` | عرض الوضع الحالي (AI_ACTIVE / HUMAN_MODE) |
وأي رسالة يدوية عادية من المشرف توقف AI تلقائياً لمدة `HUMAN_TAKEOVER_MINUTES`.

## Endpoints
- `GET /health` → `{status, whatsapp, ai, uptime}`
- `GET /status` → معلومات تقنية غير حساسة
- `GET /qr?token=...` → صفحة ربط الـQR

## خطة الانتقال من OpenClaw (آمنة)
1. **Phase 1–2:** بناء واختبار Abjad Agent (Docker + AI + health) بدون ربط واتساب.
2. **Phase 3:** إيقاف واتساب OpenClaw (أو إيقاف container الخاص به) لتفادي الرد المزدوج.
3. **Phase 4:** تشغيل Abjad Agent وربط نفس الرقم عبر `/qr`.
4. **Phase 5:** إرسال رسالة اختبار من رقم آخر.
5. **Phase 6:** ترك OpenClaw متوقفاً.

> ⚠️ لا تشغّل وكيلين مع الرد التلقائي على نفس الرقم في آن واحد.

## إعادة الربط (لو انتهت الجلسة)
أوقف الـcontainer، امسح volume الخاص بـ `whatsapp-auth`، أعد التشغيل، وامسح QR جديد.

## البنية
```
src/
  config.ts            إعدادات من env
  logger.ts            pino + تدوير اللوجات
  runtime.ts           حالة مشتركة (حالة الاتصال/QR)
  db/index.ts          SQLite + الجداول
  ai/                  AIProvider (anthropic | openai) + تحميل الـprompt
  memory/conversation  ذاكرة محدودة + ملخّص
  takeover/takeover    Human takeover
  whatsapp/client      اتصال Baileys + إعادة اتصال + استقبال الرسائل
  whatsapp/processor   طابور لكل مستخدم + debounce + retry
  health/server        Health API + صفحة QR
  index.ts             نقطة التشغيل
prompts/system-prompt.txt   شخصية Abjad Agi (قابلة للتعديل)
```
