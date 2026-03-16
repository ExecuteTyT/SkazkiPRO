/**
 * СказкиПро — Email Collection API
 * 
 * POST /api/collect-email
 * 
 * Accepts JSON: { email: string, source?: string }
 * 
 * Stores emails. Replace the storage with your preferred solution:
 *   - Google Sheets (via API)
 *   - Notion database
 *   - Airtable
 *   - Your own DB
 *   - Or just use Formspree and skip this endpoint
 */

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, source } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    const timestamp = new Date().toISOString();
    
    // ════════════════════════════════════════
    // Option 1: Log to console (Vercel logs)
    // ════════════════════════════════════════
    console.log('NEW_EMAIL_SIGNUP:', JSON.stringify({ email, source, timestamp }));

    // ════════════════════════════════════════
    // Google Sheets via Apps Script
    // ════════════════════════════════════════
    if (process.env.GOOGLE_SHEETS_WEBHOOK) {
      await fetch(process.env.GOOGLE_SHEETS_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source, timestamp }),
      });
    }

    // ════════════════════════════════════════
    // Option 3: Send to Telegram bot
    // Uncomment and set TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
    // ════════════════════════════════════════
    /*
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      const text = `📧 Новая заявка СказкиПро!\n\nEmail: ${email}\nИсточник: ${source || 'landing'}\nВремя: ${timestamp}`;
      await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: text,
          parse_mode: 'HTML',
        }),
      });
    }
    */

    return res.status(200).json({ ok: true, message: 'Email saved' });

  } catch (err) {
    console.error('Email collection error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
