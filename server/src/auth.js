import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'pf_admin';

export function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  // Fail closed: a default secret would let anyone mint an admin token.
  if (!secret || secret.length < 24) {
    throw new Error('JWT_SECRET must be set to at least 24 characters');
  }
  return secret;
}

export function issueSession(res, user) {
  const token = jwt.sign({ sub: user.id, email: user.email, name: user.display_name }, jwtSecret(), {
    expiresIn: '12h',
  });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 12 * 60 * 60 * 1000,
  });
  return token;
}

export function clearSession(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

export function requireAdmin(req, res, next) {
  const bearer = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  const token = req.cookies?.[COOKIE_NAME] || bearer;
  if (!token) return res.status(401).json({ error: 'Not signed in' });
  try {
    req.admin = jwt.verify(token, jwtSecret());
    return next();
  } catch {
    return res.status(401).json({ error: 'Session expired, please sign in again' });
  }
}
