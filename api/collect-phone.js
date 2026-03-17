/**
 * СказкиПро — Phone Collection API
 *
 * POST /api/collect-phone
 *
 * Accepts JSON: { phone: string, source?: string }
 */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { phone, source, timestamp } = req.body;

    const digits = (phone || '').replace(/\D/g, '');
    if (digits.length !== 11) {
      return res.status(400).json({ error: 'Valid phone required' });
    }

    const ts = timestamp || new Date().toISOString();

    console.log('NEW_PHONE_SIGNUP:', JSON.stringify({ phone, source, timestamp: ts }));

    if (process.env.GOOGLE_SHEETS_WEBHOOK) {
      await fetch(process.env.GOOGLE_SHEETS_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, source, timestamp: ts }),
      });
    }

    return res.status(200).json({ ok: true, message: 'Phone saved' });

  } catch (err) {
    console.error('Phone collection error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};
