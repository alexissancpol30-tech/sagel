// functions/api/auth/login.js
import { signJWT, hashPass, json, err } from '../_auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); }
  catch { return err('JSON inválido'); }

  const { login, pass } = body || {};
  if (!login || !pass) return err('Usuario y contraseña requeridos');

  const passHash = await hashPass(pass);

  // Buscar usuario en D1
  const result = await env.DB.prepare(
    `SELECT id, login, nombre, rol, estado, pass_hash FROM users WHERE login = ? AND estado = 'activo' LIMIT 1`
  ).bind(login).first();

  if (!result) return err('Usuario o contraseña incorrectos', 401);

  // Comparar hash — compatibilidad con texto plano durante migración inicial
  const match = result.pass_hash === passHash || result.pass_hash === pass;
  if (!match) return err('Usuario o contraseña incorrectos', 401);

  // Actualizar last_login
  await env.DB.prepare(`UPDATE users SET last_login = datetime('now') WHERE id = ?`)
    .bind(result.id).run();

  // Registrar en auditoría
  await env.DB.prepare(
    `INSERT INTO auditoria (usuario, modulo, accion, detalle) VALUES (?, 'Auth', 'Inicio de sesión', '')`
  ).bind(result.login).run();

  // Generar JWT (expira en 8 horas)
  const secret = env.JWT_SECRET || 'sagel-secret-piloto-2025';
  const token = await signJWT({
    id:     result.id,
    login:  result.login,
    nombre: result.nombre,
    rol:    result.rol,
    exp:    Math.floor(Date.now() / 1000) + 8 * 3600,
  }, secret);

  return json({
    ok: true,
    token,
    user: { id: result.id, login: result.login, nombre: result.nombre, rol: result.rol }
  });
}
