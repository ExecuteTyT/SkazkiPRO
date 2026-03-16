/**
 * СказкиПро — Voice Clone & Generate API
 * 
 * POST /api/generate-voice
 * 
 * Accepts multipart form data:
 *   - audio: WebM/WAV file (user's voice recording, 15-30 sec)
 *   - story: "dragon" | "moon" (which fairy tale to generate)
 * 
 * Flow:
 *   1. Receive user's voice recording
 *   2. Create instant voice clone via ElevenLabs API
 *   3. Generate fairy tale audio with cloned voice
 *   4. Delete the temporary voice clone (cleanup)
 *   5. Return audio as MP3
 * 
 * Environment variables needed:
 *   ELEVENLABS_API_KEY — your ElevenLabs API key (Creator plan or above)
 */

const formidable = require('formidable');
const { readFileSync } = require('fs');

// ── Fairy tale texts (short versions for demo) ──
const STORIES = {
  dragon: {
    title: 'Дракон и печенье',
    text: `Жил-был маленький дракон, который не умел дышать огнём. 
Вместо пламени у него изо рта шёл аромат свежего печенья. 
Другие драконы смеялись над ним. Но однажды в лесу заблудилась маленькая девочка. 
Она была голодная и испуганная. Дракон подошёл к ней и выдохнул — 
и прямо из воздуха появилось тёплое, ароматное печенье. 
Девочка улыбнулась, и с тех пор они стали лучшими друзьями. 
А дракон понял: его особенность — это не слабость, а самая настоящая суперсила.`
  },
  moon: {
    title: 'Путешествие на Луну',
    text: `Однажды ночью маленький мальчик посмотрел в окно и увидел, 
что Луна грустит. Он построил ракету из подушек и одеял, 
закрыл глаза — и полетел! На Луне он нашёл лунного зайчика, 
который потерял свою любимую звёздочку. Мальчик помог ему искать, 
и они нашли её за самым большим лунным кратером. 
Зайчик так обрадовался, что подарил мальчику кусочек лунного света. 
Теперь каждую ночь этот свет мягко горит у мальчика на тумбочке, 
напоминая: добрые дела светят даже в темноте.`
  }
};

// ── Disable default body parser for multipart ──
module.exports.config = {
  api: {
    bodyParser: false,
  },
};

module.exports = async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  const API_KEY = process.env.ELEVENLABS_API_KEY;
  if (!API_KEY) {
    return res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured' });
  }

  let voiceId = null;

  try {
    // ── Step 1: Parse multipart form ──
    const { fields, files } = await parseForm(req);
    
    const storyKey = Array.isArray(fields.story) ? fields.story[0] : fields.story;
    const audioFile = Array.isArray(files.audio) ? files.audio[0] : files.audio;

    if (!audioFile) {
      return res.status(400).json({ error: 'No audio file provided' });
    }
    if (!STORIES[storyKey]) {
      return res.status(400).json({ error: 'Invalid story. Use "dragon" or "moon"' });
    }

    const audioBuffer = readFileSync(audioFile.filepath);
    const mimeType = audioFile.mimetype || 'audio/webm';

    // ── Step 2: Create instant voice clone ──
    console.log('Creating voice clone...');
    
    const cloneFormData = new FormData();
    cloneFormData.append('name', 'skazki_user_' + Date.now());
    cloneFormData.append('description', 'Temporary clone for СказкиПро demo');
    cloneFormData.append('remove_background_noise', 'true');
    
    // Convert buffer to Blob for FormData
    const audioBlob = new Blob([audioBuffer], { type: mimeType });
    cloneFormData.append('files', audioBlob, 'recording.webm');

    const cloneRes = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
      },
      body: cloneFormData,
    });

    if (!cloneRes.ok) {
      const errText = await cloneRes.text();
      console.error('Clone error:', cloneRes.status, errText);
      return res.status(502).json({ error: 'Voice cloning failed', details: errText });
    }

    const cloneData = await cloneRes.json();
    voiceId = cloneData.voice_id;
    console.log('Voice cloned:', voiceId);

    // ── Step 3: Generate speech with cloned voice ──
    console.log('Generating speech...');
    
    const ttsRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: STORIES[storyKey].text,
        model_id: 'eleven_multilingual_v2', // Best for Russian
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.85,
          style: 0.3,
          use_speaker_boost: true,
        },
      }),
    });

    if (!ttsRes.ok) {
      const errText = await ttsRes.text();
      console.error('TTS error:', ttsRes.status, errText);
      return res.status(502).json({ error: 'Speech generation failed', details: errText });
    }

    // ── Step 4: Return audio ──
    const audioArrayBuffer = await ttsRes.arrayBuffer();
    const audioOutputBuffer = Buffer.from(audioArrayBuffer);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioOutputBuffer.length);
    res.setHeader('X-Story-Title', encodeURIComponent(STORIES[storyKey].title));
    res.status(200).send(audioOutputBuffer);

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  } finally {
    // ── Step 5: Cleanup — delete temporary voice clone ──
    if (voiceId) {
      try {
        await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
          method: 'DELETE',
          headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
        });
        console.log('Voice clone deleted:', voiceId);
      } catch (cleanupErr) {
        console.error('Cleanup error:', cleanupErr);
      }
    }
  }
};

// ── Helper: parse multipart form with formidable ──
function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10 MB
      allowEmptyFiles: false,
    });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}
