// functions/api/_auth.js
// Utilidades de autenticación compartidas

const JWT_SECRET_ENV = 'JWT_SECRET'; // Variable de entorno en Cloudflare

// ── Encode/decode base64url (Web Crypto compatible, sin Node.js) ──
function b64url(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
function b64decode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return atob(str);
}

// ── HMAC-SHA256 JWT liviano usando Web Crypto API ──
async function signJWT(payload, secret) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body   = b64url(JSON.stringify(payload));
  const data   = `${header}.${body}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigB64 = b64url(String.fromCharCode(...new Uint8Array(sig)));
  return `${data}.${sigB64}`;
}

async function verifyJWT(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Token inválido');
  const [header, body, sig] = parts;
  const data = `${header}.${body}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const sigBytes = Uint8Array.from(b64decode(sig), c => c.charCodeAt(0));
  const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data));
  if (!valid) throw new Error('Firma inválida');

  const payload = JSON.parse(b64decode(body));
  if (payload.exp && Date.now() / 1000 > payload.exp) throw new Error('Token expirado');
  return payload;
}

// ── Hash de contraseña con SHA-256 (simple, suficiente para piloto) ──
async function hashPass(pass) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pass));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Extraer y verificar token del header Authorization ──
async function requireAuth(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) throw new Error('No autenticado');
  const secret = env[JWT_SECRET_ENV] || 'sagel-secret-piloto-2025';
  return verifyJWT(token, secret);
}

// ── Verificar permiso ──
const PERMS = {
  write:  ['admin', 'secretario', 'asesor'],
  delete: ['admin', 'secretario'],
  admin:  ['admin'],
};
function canDo(payload, perm) {
  return (PERMS[perm] || []).includes(payload.rol);
}

// ── Respuesta JSON estándar ──
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
function err(msg, status = 400) {
  return json({ ok: false, error: msg }, status);
}

export { signJWT, verifyJWT, hashPass, requireAuth, canDo, json, err };
