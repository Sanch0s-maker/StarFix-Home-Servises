const requests = new Map();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting - max 3 requests per IP per 10 minutes
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const maxRequests = 3;

  const record = requests.get(ip) || { count: 0, start: now };
  if (now - record.start > windowMs) {
    record.count = 0;
    record.start = now;
  }
  record.count++;
  requests.set(ip, record);

  if (record.count > maxRequests) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  const { firstName, lastName, email, phone, service, notes } = req.body;

  // Basic validation
  if (!firstName || !phone) {
    return res.status(400).json({ error: 'Name and phone are required.' });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  const fullName = `${firstName}${lastName ? ' ' + lastName : ''}`;

  const message = [
    '🔔 *New StarFix Quote Request!*',
    '',
    `👤 *Name:* ${fullName}`,
    `📱 *Phone:* ${phone}`,
    `📧 *Email:* ${email || 'not provided'}`,
    `🔧 *Service:* ${service || 'not specified'}`,
    '',
    `📝 *Project Details:* ${notes || 'none'}`,
  ].join('\n');

  const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      return res.status(500).json({ error: 'Telegram error' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}
