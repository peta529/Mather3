const crypto = require('crypto');

// Токен сессии — это HMAC от секрета проекта. Секретом служит
// BLOB_READ_WRITE_TOKEN, который Vercel и так автоматически создаёт
// при подключении Blob-хранилища, так что отдельный секрет не нужен.
function expectedToken() {
  const secret = process.env.BLOB_READ_WRITE_TOKEN || 'dev-secret';
  return crypto.createHmac('sha256', secret).update('admin-session').digest('hex');
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach(part => {
    const idx = part.indexOf('=');
    if (idx > -1) {
      out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
    }
  });
  return out;
}

function isAdmin(req) {
  const cookies = parseCookies(req);
  return Boolean(cookies.admin_token) && cookies.admin_token === expectedToken();
}

module.exports = { expectedToken, parseCookies, isAdmin };
