# СказкиПро — Backend

Бэкенд для лендинга СказкиПро. Два API-эндпоинта:

1. **`/api/generate-voice`** — принимает запись голоса, клонирует через ElevenLabs, озвучивает сказку
2. **`/api/collect-email`** — собирает email-адреса с лендинга

## Быстрый старт

### 1. Установка

```bash
npm install
```

### 2. Настройка ElevenLabs

1. Зарегистрируйтесь на [elevenlabs.io](https://elevenlabs.io)
2. Оформите подписку **Creator** ($22/мес) — нужен доступ к API клонирования
3. Скопируйте API-ключ из [Settings → API Keys](https://elevenlabs.io/app/settings/api-keys)

### 3. Environment Variables

```bash
cp .env.example .env
# Вставьте ваш ELEVENLABS_API_KEY в .env
```

### 4. Деплой на Vercel

```bash
# Установите Vercel CLI
npm i -g vercel

# Деплой
vercel

# Добавьте env variables
vercel env add ELEVENLABS_API_KEY
```

### 5. Подключите лендинг

В файле `skazki-pro-interactive.html` замените URL бэкенда:

```javascript
// В функции selectStory():
const response = await fetch('https://YOUR-PROJECT.vercel.app/api/generate-voice', {
  method: 'POST',
  body: formData
});
```

```javascript
// В функции submitEmail():
fetch('https://YOUR-PROJECT.vercel.app/api/collect-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, source: 'skazki-pro' })
});
```

## Как работает озвучка

```
Пользователь записывает голос (15-30 сек)
        ↓
Аудио отправляется на /api/generate-voice
        ↓
ElevenLabs: POST /v1/voices/add (клонирование)
        ↓
ElevenLabs: POST /v1/text-to-speech/{voice_id}
  (модель: eleven_multilingual_v2, лучшая для русского)
        ↓
MP3-аудио возвращается пользователю
        ↓
Временный голос удаляется (cleanup)
```

Среднее время генерации: **8-15 секунд**.

## Сбор email

Эндпоинт `/api/collect-email` по умолчанию логирует в Vercel Logs.
Для продакшена раскомментируйте одну из опций в коде:

- **Google Sheets** — через Apps Script webhook
- **Telegram бот** — мгновенные уведомления о новых заявках
- **Или** замените на Airtable, Notion, Supabase и т.д.

### Настройка Telegram-уведомлений (рекомендуется)

1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Получите chat_id через [@userinfobot](https://t.me/userinfobot)
3. Добавьте в Vercel env:
   ```
   TELEGRAM_BOT_TOKEN=123456:ABC-DEF
   TELEGRAM_CHAT_ID=-100123456789
   ```
4. Раскомментируйте блок "Option 3: Telegram" в `api/collect-email.js`

## Стоимость

| Компонент | Стоимость |
|-----------|-----------|
| ElevenLabs Creator | $22/мес (100K символов ≈ 200 генераций сказок) |
| Vercel Hobby | Бесплатно (до 100K запросов/мес) |
| Домен (опционально) | ~$10/год |
| **Итого** | **~$22/мес** |

## Лимиты

- ElevenLabs Creator: 100,000 символов/мес
- Каждая сказка ≈ 500 символов → ~200 генераций/мес
- Для теста с Директом этого более чем достаточно
- Если нужно больше: план Scale ($99/мес, 500K символов)

## Структура

```
skazki-pro-backend/
├── api/
│   ├── generate-voice.js    # Клонирование + озвучка
│   └── collect-email.js     # Сбор email
├── .env.example
├── package.json
├── vercel.json
└── README.md
```
