// functions/api/expedientes.js
// GET /api/expedientes        → lista
// POST /api/expedientes       → crear
// PUT /api/expedientes        → actualizar (id en body)
// DELETE /api/expedientes     → eliminar (?id=)

import { requireAuth, canDo, json, err } from './_auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  try { await requireAuth(request, env); } catch(e) { return err(e.message, 401); }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (id) {
    const exp = await env.DB.prepare(`SELECT * FROM expedientes WHERE id = ?`).bind(id).first();
    if (!exp) return err('No encontrado', 404);

    const archivos  = await env.DB.prepare(`SELECT id, nombre, tipo_mime, tamaño, datos FROM expediente_archivos WHERE expediente_id = ?`).bind(id).all();
    const historial = await env.DB.prepare(`SELECT * FROM expediente_historial WHERE expediente_id = ? ORDER BY created_at DESC`).bind(id).all();

    return json({ ok: true, data: { ...exp, archivos: archivos.results, historial: historial.results } });
  }

  const { results } = await env.DB.prepare(
    `SELECT id, numero, tipo, caratula, autor, bloque, fecha_ingreso, estado_parl,
            comision_actual, prioridad, estado_int, responsable, fecha_limite, fecha_mod
     FROM expedientes ORDER BY id DESC`
  ).all();
  return json({ ok: true, data: results });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let payload;
  try { payload = await requireAuth(request, env); } catch(e) { return err(e.message, 401); }
  if (!canDo(payload, 'write')) return err('Sin permisos', 403);

  let body;
  try { body = await request.json(); } catch { return err('JSON inválido'); }

  const { numero, caratula, archivos = [], ...rest } = body;
  if (!numero || !caratula) return err('Número y carátula son obligatorios');

  const now = new Date().toISOString().slice(0, 10);

  const result = await env.DB.prepare(`
    INSERT INTO expedientes
      (numero, tipo, caratula, autor, bloque, fecha_ingreso, estado_parl,
       comision_actual, comisiones_giro, obs, notas_int, responsable,
       prioridad, estado_int, fecha_limite, fecha_mod, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    numero, rest.tipo||'Proyecto de Ley', caratula,
    rest.autor||'', rest.bloque||'', rest.fechaIngreso||now,
    rest.estadoParl||'Ingresado', rest.comisionActual||'',
    rest.comisionesGiro||'', rest.obs||'', rest.notasInt||'',
    rest.responsable||'', rest.prioridad||'Media',
    rest.estadoInt||'Pendiente revisión', rest.fechaLimite||'',
    now, payload.login
  ).run();

  const newId = result.meta.last_row_id;

  // Historial inicial
  await env.DB.prepare(
    `INSERT INTO expediente_historial (expediente_id, usuario, accion, fecha, hora) VALUES (?,?,?,?,?)`
  ).bind(newId, payload.login, 'Creación del expediente', now, new Date().toTimeString().slice(0,5)).run();

  // Archivos adjuntos
  for (const a of archivos) {
    if (a.data) {
      await env.DB.prepare(
        `INSERT INTO expediente_archivos (expediente_id, nombre, tipo_mime, tamaño, datos) VALUES (?,?,?,?,?)`
      ).bind(newId, a.name||a.nombre, a.type||a.tipo_mime||'', a.size||a.tamaño||0, a.data).run();
    }
  }

  await _audit(env, payload.login, 'Expedientes', 'Creación', `${numero} — ${caratula}`);
  return json({ ok: true, id: newId }, 201);
}

export async function onRequestPut(context) {
  const { request, env } = context;
  let payload;
  try { payload = await requireAuth(request, env); } catch(e) { return err(e.message, 401); }
  if (!canDo(payload, 'write')) return err('Sin permisos', 403);

  let body;
  try { body = await request.json(); } catch { return err('JSON inválido'); }

  const { id, numero, caratula, archivos = [], archivosNuevos = [], ...rest } = body;
  if (!id) return err('ID requerido');

  const now = new Date().toISOString().slice(0, 10);

  await env.DB.prepare(`
    UPDATE expedientes SET
      numero=?, tipo=?, caratula=?, autor=?, bloque=?, fecha_ingreso=?,
      estado_parl=?, comision_actual=?, comisiones_giro=?, obs=?, notas_int=?,
      responsable=?, prioridad=?, estado_int=?, fecha_limite=?, fecha_mod=?
    WHERE id=?
  `).bind(
    numero, rest.tipo||'', caratula,
    rest.autor||'', rest.bloque||'', rest.fechaIngreso||'',
    rest.estadoParl||'', rest.comisionActual||'',
    rest.comisionesGiro||'', rest.obs||'', rest.notasInt||'',
    rest.responsable||'', rest.prioridad||'Media',
    rest.estadoInt||'', rest.fechaLimite||'', now, id
  ).run();

  // Agregar entrada al historial
  await env.DB.prepare(
    `INSERT INTO expediente_historial (expediente_id, usuario, accion, fecha, hora) VALUES (?,?,?,?,?)`
  ).bind(id, payload.login, `Modificación`, now, new Date().toTimeString().slice(0,5)).run();

  // Archivos nuevos
  for (const a of archivosNuevos) {
    if (a.data) {
      await env.DB.prepare(
        `INSERT INTO expediente_archivos (expediente_id, nombre, tipo_mime, tamaño, datos) VALUES (?,?,?,?,?)`
      ).bind(id, a.name||a.nombre, a.type||a.tipo_mime||'', a.size||a.tamaño||0, a.data).run();
    }
  }

  await _audit(env, payload.login, 'Expedientes', 'Modificación', `ID ${id}`);
  return json({ ok: true });
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  let payload;
  try { payload = await requireAuth(request, env); } catch(e) { return err(e.message, 401); }
  if (!canDo(payload, 'delete')) return err('Sin permisos', 403);

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return err('ID requerido');

  await env.DB.prepare(`DELETE FROM expedientes WHERE id=?`).bind(id).run();
  await _audit(env, payload.login, 'Expedientes', 'Eliminación', `ID ${id}`);
  return json({ ok: true });
}

async function _audit(env, usuario, modulo, accion, detalle) {
  await env.DB.prepare(
    `INSERT INTO auditoria (usuario, modulo, accion, detalle) VALUES (?,?,?,?)`
  ).bind(usuario, modulo, accion, detalle||'').run();
}
