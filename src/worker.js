const CATEGORY_LABELS = {
  membership: { zh: '我要加入', en: 'Membership interest' },
  sponsorship: { zh: '企業合作／贊助', en: 'Corporate partnership / sponsorship' },
  question: { zh: '詢問問題', en: 'Question' },
  other: { zh: '其他', en: 'Other' }
};

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff'
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function textValue(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[character]);
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function requestIsSameOrigin(request) {
  const origin = request.headers.get('Origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

async function handleContact(request, env) {
  if (request.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  if (!requestIsSameOrigin(request)) {
    return json({ error: 'invalid_origin' }, 403);
  }

  const contentType = request.headers.get('Content-Type') || '';
  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (!contentType.includes('application/json') || contentLength > 20_000) {
    return json({ error: 'invalid_request' }, 400);
  }

  let payload;
  try {
    const rawBody = await request.text();
    if (rawBody.length > 20_000) return json({ error: 'invalid_request' }, 400);
    payload = JSON.parse(rawBody);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('invalid_payload');
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  // Bots commonly complete hidden fields. Return success without sending mail
  // so the field cannot be used to probe the spam filter.
  if (textValue(payload.company, 200)) {
    return json({ ok: true });
  }

  const startedAt = Number(payload.startedAt);
  const elapsed = Date.now() - startedAt;
  if (!Number.isFinite(startedAt) || elapsed < 1_500 || elapsed > 3_600_000) {
    return json({ error: 'invalid_timing' }, 400);
  }

  const name = textValue(payload.name, 100);
  const email = textValue(payload.email, 254).toLowerCase();
  const category = textValue(payload.category, 40);
  const message = textValue(payload.message, 3_000);
  const language = payload.language === 'en' ? 'en' : 'zh';

  if (name.length < 2 || !validEmail(email) || !CATEGORY_LABELS[category] || message.length < 10) {
    return json({ error: 'validation_failed' }, 400);
  }

  if (!env.CONTACT_EMAIL || !env.CONTACT_RECIPIENT) {
    console.error('Contact form bindings are not configured.');
    return json({ error: 'service_unavailable' }, 503);
  }

  const categoryLabel = CATEGORY_LABELS[category][language];
  const subject = `[TAITA SoCal 網站留言] ${categoryLabel} — ${name}`;
  const plainText = [
    'TAITA SoCal 網站收到新留言',
    '',
    `類別 / Category: ${categoryLabel}`,
    `姓名 / Name: ${name}`,
    `Email: ${email}`,
    `語言 / Language: ${language === 'zh' ? '中文' : 'English'}`,
    '',
    '留言 / Message:',
    message
  ].join('\n');

  const html = `
    <h2>TAITA SoCal 網站收到新留言</h2>
    <p><strong>類別 / Category:</strong> ${escapeHtml(categoryLabel)}</p>
    <p><strong>姓名 / Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
    <p><strong>語言 / Language:</strong> ${language === 'zh' ? '中文' : 'English'}</p>
    <hr>
    <p><strong>留言 / Message:</strong></p>
    <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
  `;

  try {
    await env.CONTACT_EMAIL.send({
      to: env.CONTACT_RECIPIENT,
      from: { email: 'website@taitasocal.org', name: 'TAITA SoCal Website' },
      replyTo: { email, name },
      subject,
      text: plainText,
      html
    });
  } catch (error) {
    console.error('Unable to deliver contact form message.', error);
    return json({ error: 'delivery_failed' }, 502);
  }

  return json({ ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/contact') {
      return handleContact(request, env);
    }
    return env.ASSETS.fetch(request);
  }
};
