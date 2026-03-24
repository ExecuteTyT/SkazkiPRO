/**
 * СказкиПро — Demo Generation API
 *
 * POST /api/generate-demo
 *
 * Accepts JSON:
 *   - name: string (child's name, 2-20 chars, letters only)
 *   - gender: "boy" | "girl"
 *   - photo: string (base64 data URI, image/jpeg|png|webp, < 5MB)
 *
 * Returns JSON:
 *   - audio: base64 mp3 string
 *   - image: base64 png string (face-swap result or fallback template)
 *   - paragraphs: string[] (story paragraphs for text sync)
 *   - name: string
 *
 * Environment variables:
 *   ELEVENLABS_API_KEY — required
 *   ELEVENLABS_VOICE_ID — narrator voice ID (pre-made, not clone)
 *   AKOOL_API_KEY — for face-swap (optional, fallback to template)
 *   TEMPLATE_SCENE_URL — URL of cartoon template image for face-swap
 */

// ── Rate limiting (in-memory, best-effort for serverless) ──
const rateMap = new Map();
const RATE_LIMIT = 3;
const RATE_WINDOW = 30 * 60 * 1000; // 30 minutes

function checkRateLimit(ip) {
  const now = Date.now();
  const hits = (rateMap.get(ip) || []).filter(t => now - t < RATE_WINDOW);
  if (hits.length >= RATE_LIMIT) return false;
  hits.push(now);
  rateMap.set(ip, hits);
  // Cleanup old IPs periodically
  if (rateMap.size > 1000) {
    for (const [key, times] of rateMap) {
      const valid = times.filter(t => now - t < RATE_WINDOW);
      if (valid.length === 0) rateMap.delete(key);
      else rateMap.set(key, valid);
    }
  }
  return true;
}

// ── Input validation ──
function isValidName(name) {
  return typeof name === 'string' && /^[a-zA-Zа-яА-ЯёЁ\s\-]{2,20}$/.test(name.trim());
}

function isValidGender(gender) {
  return gender === 'boy' || gender === 'girl';
}

function validatePhoto(photo) {
  if (typeof photo !== 'string') return { valid: false, error: 'Photo must be a string' };
  // Accept both raw base64 and data URI
  let base64Data = photo;
  let mime = 'image/jpeg';
  if (photo.startsWith('data:')) {
    const match = photo.match(/^data:(image\/(jpeg|png|webp));base64,/);
    if (!match) return { valid: false, error: 'Invalid image format. Use JPEG, PNG or WebP' };
    mime = match[1];
    base64Data = photo.split(',')[1];
  }
  // Check size (~5MB in base64 is ~6.7MB string)
  if (base64Data.length > 7 * 1024 * 1024) {
    return { valid: false, error: 'Photo too large. Maximum 5MB' };
  }
  return { valid: true, base64: base64Data, mime };
}

// ── Story text generation ──
function generateStoryText(name, gender) {
  const n = name.trim();
  const isBoy = gender === 'boy';
  const verb1 = isBoy ? 'говорил' : 'говорила';
  const adj = isBoy ? 'храбрый' : 'храбрая';
  const pronoun = isBoy ? 'он' : 'она';

  const paragraphs = [
    `Жил-был один ${adj} малыш по имени ${n}.`,
    `Каждый вечер, когда за окном зажигались звёзды, мама и папа читали ему сказку и целовали на ночь.`,
    `${n} ${verb1}: «Нет-нет-нет! Я хочу спать с мамой! В моей комнате темно и страшно!»`,
    `И тут из-под кроватки засиял мягкий голубой свет, и появился маленький пушистый зверёк с крылышками — Хранитель Снов.`,
    `«Привет, ${n}! Не бойся — я охраняю сны всех храбрых детей! Пока ты спишь, я буду рядом, и тебе приснятся самые волшебные сны!» И ${n} улыбнулся, закрыл глазки и уснул — потому что ${pronoun} знал: Хранитель Снов всегда рядом.`
  ];

  const text = paragraphs.join(' ');
  return { text, paragraphs };
}

// ── ElevenLabs TTS ──
async function generateVoice(text) {
  const API_KEY = process.env.ELEVENLABS_API_KEY;
  const VOICE_ID = process.env.ELEVENLABS_VOICE_ID;

  if (!API_KEY) throw new Error('ELEVENLABS_API_KEY not configured');
  if (!VOICE_ID) throw new Error('ELEVENLABS_VOICE_ID not configured');

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.65,
          similarity_boost: 0.75,
          style: 0.3,
          speed: 0.9,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error('ElevenLabs TTS error:', response.status, errText);
    throw new Error('ElevenLabs TTS failed: ' + response.status);
  }

  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

// ── Face Swap (Akool API) ──
async function generateFaceSwap(photoBase64, photoMime) {
  const AKOOL_API_KEY = process.env.AKOOL_API_KEY;
  const TEMPLATE_URL = process.env.TEMPLATE_SCENE_URL;

  if (!AKOOL_API_KEY || !TEMPLATE_URL) {
    console.log('Face-swap not configured, using template fallback');
    return fetchTemplateImage(TEMPLATE_URL);
  }

  try {
    // Step 1: Get Akool auth token
    const authRes = await fetch('https://openapi.akool.com/api/open/v3/getToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: process.env.AKOOL_CLIENT_ID || '',
        clientSecret: AKOOL_API_KEY,
      }),
    });

    if (!authRes.ok) throw new Error('Akool auth failed: ' + authRes.status);
    const authData = await authRes.json();
    const token = authData.token;

    // Step 2: Upload child photo as data URI for Akool
    // Akool accepts base64 image in sourceImage
    const faceSwapRes = await fetch('https://openapi.akool.com/api/open/v3/faceswap/highquality/specifyimage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sourceImage: [
          { path: TEMPLATE_URL, opts: 'face1' }
        ],
        targetImage: [
          { path: `data:${photoMime};base64,${photoBase64}`, opts: 'face1' }
        ],
        modifyImage: TEMPLATE_URL,
      }),
    });

    if (!faceSwapRes.ok) throw new Error('Akool face-swap failed: ' + faceSwapRes.status);
    const faceSwapData = await faceSwapRes.json();

    // Akool returns a URL to the result; fetch it and convert to base64
    if (faceSwapData.data && faceSwapData.data.url) {
      const resultRes = await fetch(faceSwapData.data.url);
      const resultBuffer = await resultRes.arrayBuffer();
      return Buffer.from(resultBuffer).toString('base64');
    }

    // If result has _id, poll for completion
    if (faceSwapData.data && faceSwapData.data._id) {
      const jobId = faceSwapData.data._id;
      // Poll up to 30 seconds
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const statusRes = await fetch(
          `https://openapi.akool.com/api/open/v3/faceswap/highquality/infobymodelid?_id=${jobId}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          if (statusData.data && statusData.data.url) {
            const resultRes = await fetch(statusData.data.url);
            const resultBuffer = await resultRes.arrayBuffer();
            return Buffer.from(resultBuffer).toString('base64');
          }
          if (statusData.data && statusData.data.status === 3) {
            throw new Error('Face-swap job failed');
          }
        }
      }
      throw new Error('Face-swap timeout');
    }

    throw new Error('Unexpected Akool response');
  } catch (error) {
    console.error('Face-swap failed, using template:', error.message);
    return fetchTemplateImage(TEMPLATE_URL);
  }
}

async function fetchTemplateImage(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    return Buffer.from(buffer).toString('base64');
  } catch {
    return null;
  }
}

// ── Main handler ──
module.exports = async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || '';
  const allowedOrigins = ['https://www.skazkipro.pro', 'https://skazkipro.pro'];
  const corsOrigin = allowedOrigins.includes(origin) ? origin
    : /^https?:\/\/localhost(:\d+)?$/.test(origin) || /\.vercel\.app$/.test(origin) ? origin
    : allowedOrigins[0];

  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Rate limiting
    const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
    if (!checkRateLimit(ip)) {
      return res.status(429).json({
        error: 'Слишком много запросов. Попробуйте через 30 минут.'
      });
    }

    // Parse and validate input
    const { name, gender, photo } = req.body || {};

    if (!name || !isValidName(name)) {
      return res.status(400).json({
        error: 'Имя должно содержать 2-20 букв (кириллица или латиница)'
      });
    }
    if (!isValidGender(gender)) {
      return res.status(400).json({ error: 'Укажите пол: boy или girl' });
    }
    if (!photo) {
      return res.status(400).json({ error: 'Фото обязательно' });
    }
    const photoValidation = validatePhoto(photo);
    if (!photoValidation.valid) {
      return res.status(400).json({ error: photoValidation.error });
    }

    // Generate story text
    const { text, paragraphs } = generateStoryText(name, gender);

    // Parallel API calls: TTS + face-swap
    const [audioResult, imageResult] = await Promise.allSettled([
      generateVoice(text),
      generateFaceSwap(photoValidation.base64, photoValidation.mime),
    ]);

    // Audio is required
    if (audioResult.status === 'rejected') {
      console.error('TTS failed:', audioResult.reason);
      return res.status(502).json({ error: 'Ошибка генерации озвучки. Попробуйте позже.' });
    }

    // Image can fallback to null (frontend will handle)
    const audioBase64 = audioResult.value;
    const imageBase64 = imageResult.status === 'fulfilled' ? imageResult.value : null;

    return res.status(200).json({
      audio: audioBase64,
      image: imageBase64,
      paragraphs,
      name: name.trim(),
    });

  } catch (error) {
    console.error('Generate demo error:', error);
    return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
};
