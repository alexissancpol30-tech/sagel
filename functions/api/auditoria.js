// functions/api/auditoria.js
import { requireAuth, canDo, json, err } from './_auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  let payload;
  try { payload = await requireAuth(request, env); } catch(e) { return err(e.message, 401); }
  if (!canDo(payload, 'admin') && payload.rol !== 'secretario') return err('Sin permisos', 403);

  const url = new URL(request.url);
  const modulo  = url.searchParams.get('modulo') || '';
  const usuario = url.searchParams.get('usuario') || '';
  const desde   = url.searchParams.get('desde') || '';
  const hasta   = url.searchParams.get('hasta') || '';
  const limit   = Math.min(parseInt(url.searchParams.get('limit') || '200'), 500);

  let query = `SELECT * FROM auditoria WHERE 1=1`;
  const binds = [];
  if (modulo)  { query += ` AND modulo = ?`;          binds.push(modulo); }
  if (usuario) { query += ` AND usuario = ?`;          binds.push(usuario); }
  if (desde)   { query += ` AND ts >= ?`;              binds.push(desde); }
  if (hasta)   { query += ` AND ts <= ? || 'T23:59:59'`; binds.push(hasta); }
  query += ` ORDER BY ts DESC LIMIT ?`;
  binds.push(limit);

  const { results } = await env.DB.prepare(query).bind(...binds).all();

  // Módulos y usuarios únicos para filtros
  const mods  = await env.DB.prepare(`SELECT DISTINCT modulo FROM auditoria ORDER BY modulo`).all();
  const usrs  = await env.DB.prepare(`SELECT DISTINCT usuario FROM auditoria ORDER BY usuario`).all();

  return json({
    ok: true,
    data: results,
    meta: {
      modulos:  mods.results.map(r => r.modulo),
      usuarios: usrs.results.map(r => r.usuario),
    }
  });
}
