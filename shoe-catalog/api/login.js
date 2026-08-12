const { expectedToken } = require('../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  if (!process.env.ADMIN_PASSWORD) {
    res.status(500).json({ error: 'Пароль адміна не налаштований на сервері (змінна ADMIN_PASSWORD)' });
    return;
  }
  const { password } = req.body || {};
  if (password && password === process.env.ADMIN_PASSWORD) {
    const token = expectedToken();
    res.setHeader(
      'Set-Cookie',
      `admin_token=${token}; HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax; Secure`
    );
    res.status(200).json({ ok: true });
  } else {
    res.status(401).json({ error: 'Невірний пароль' });
  }
};
