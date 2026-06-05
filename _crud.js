// functions/api/_crud.js
// Factory de CRUD genérico para colecciones simples

import { requireAuth, canDo, json, err } from './_auth.js';

// Definición de cada colección: tabla SQL, campos permitidos, campos obligatorios
export const COLLECTIONS = {
  sesiones: {
    table: 'sesiones',
    fields: ['fecha','tipo','descripcion','orden','estado','resultado','obs','fecha_mod'],
    required: ['fecha'],
    orderBy: 'fecha DESC',
  },
  comisiones: {
    table: 'comisiones',
    fields: ['nombre','pres','vicepres','sec','integrantes','bloques',
             'reunion_fecha','reunion_hora','reunion_lugar','reunion_temario','obs','fecha_mod'],
    required: ['nombre'],
    orderBy: 'nombre ASC',
  },
  minutas: {
    table: 'minutas',
    fields: ['titulo','tipo','fecha','autor','contenido','obs','fecha_mod'],
    required: ['titulo'],
    orderBy: 'fecha DESC',
  },
  senadores: {
    table: 'senadores',
    fields: ['nombre','bloque','seccion','partido','mandato','contacto','comisiones','redes','obs'],
    required: ['nombre'],
    orderBy: 'nombre ASC',
  },
  actores: {
    table: 'actores',
    fields: ['nombre','cat','cargo','institucion','contacto','redes','obs','notas','fecha_mod'],
    required: ['nombre'],
    orderBy: 'nombre ASC',
  },
  biblioteca: {
    table: 'biblioteca',
    fields: ['titulo','cat','año','url','tags','descripcion','fecha_mod'],
    required: ['titulo'],
    orderBy: 'titulo ASC',
  },
  users: {
    table: 'users',
    fields: ['login','nombre','rol','estado'],
    required: ['login'],
    orderBy: 'login ASC',
    adminOnly: true,
  },
};

// Crear handlers para una colección específica
export function makeCRUD(colName) {
  const col = COLLECTIONS[colName];
  if (!col) throw new Error(`Colección desconocida: ${colName}`);

  async function GET(context) {
    const { request, env } = context;
    let payload;
    try { payload = await requireAuth(request, env); } catch(e) { return err(e.message, 401); }
    if (col.adminOnly && !canDo(payload, 'admin')) return err('Sin permisos', 403);

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (id) {
      const row = await env.DB.prepare(`SELECT * FROM ${col.table} WHERE id = ?`).bind(id).first();
      if (!row) return err('No encontrado', 404);
      // Ocultar pass_hash si es users
      if (col.table === 'users') delete row.pass_hash;
      return json({ ok: true, data: row });
    }

    const { results } = await env.DB.prepare(
      `SELECT * FROM ${col.table} ORDER BY ${col.orderBy}`
    ).all();

    if (col.table === 'users') results.forEach(r => delete r.pass_hash);
    return json({ ok: true, data: results });
  }

  async function POST(context) {
    const { request, env } = context;
    let payload;
    try { payload = await requireAuth(request, env); } catch(e) { return err(e.message, 401); }
    if (col.adminOnly) { if (!canDo(payload, 'admin')) return err('Sin permisos', 403); }
    else { if (!canDo(payload, 'write')) return err('Sin permisos', 403); }

    let body;
    try { body = await request.json(); } catch { return err('JSON inválido'); }

    // Validación obligatorios
    for (const f of col.required) {
      const key = snakeToCamel(f);
      const val = body[key] || body[f];
      if (!val || !String(val).trim()) return err(`Campo obligatorio: ${f}`);
    }

    const now = new Date().toISOString().slice(0, 10);

    // Para users: hashear contraseña
    if (col.table === 'users') {
      if (!body.pass) return err('Contraseña obligatoria para nuevos usuarios');
      const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body.pass));
      body.pass_hash = Array.from(new Uint8Array(hashBuf)).map(b=>b.toString(16).padStart(2,'0')).join('');

      // Verificar login único
      const existing = await env.DB.prepare(`SELECT id FROM users WHERE login = ?`).bind(body.login||body.login).first();
      if (existing) return err('El usuario ya existe');
    }

    const values = col.fields.map(f => {
      const camel = snakeToCamel(f);
      let v = body[camel] !== undefined ? body[camel] : (body[f] !== undefined ? body[f] : null);
      if (f === 'fecha_mod' && !v) v = now;
      return v;
    });

    // Para users, agregar pass_hash
    let insertFields = [...col.fields];
    let insertValues = [...values];
    if (col.table === 'users') {
      insertFields.push('pass_hash');
      insertValues.push(body.pass_hash);
    }

    const placeholders = insertFields.map(() => '?').join(',');
    const result = await env.DB.prepare(
      `INSERT INTO ${col.table} (${insertFields.join(',')}) VALUES (${placeholders})`
    ).bind(...insertValues).run();

    await _audit(env, payload.login, colName, 'Creación', `ID ${result.meta.last_row_id}`);
    return json({ ok: true, id: result.meta.last_row_id }, 201);
  }

  async function PUT(context) {
    const { request, env } = context;
    let payload;
    try { payload = await requireAuth(request, env); } catch(e) { return err(e.message, 401); }
    if (col.adminOnly) { if (!canDo(payload, 'admin')) return err('Sin permisos', 403); }
    else { if (!canDo(payload, 'write')) return err('Sin permisos', 403); }

    let body;
    try { body = await request.json(); } catch { return err('JSON inválido'); }
    if (!body.id) return err('ID requerido');

    const now = new Date().toISOString().slice(0, 10);
    const setClauses = col.fields.map(f => `${f} = ?`).join(', ');
    const values = col.fields.map(f => {
      const camel = snakeToCamel(f);
      let v = body[camel] !== undefined ? body[camel] : (body[f] !== undefined ? body[f] : null);
      if (f === 'fecha_mod' && !v) v = now;
      return v;
    });

    // Para users con nueva contraseña
    if (col.table === 'users' && body.pass && body.pass.trim()) {
      const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body.pass));
      const newHash = Array.from(new Uint8Array(hashBuf)).map(b=>b.toString(16).padStart(2,'0')).join('');
      await env.DB.prepare(`UPDATE users SET pass_hash = ? WHERE id = ?`).bind(newHash, body.id).run();
    }

    await env.DB.prepare(
      `UPDATE ${col.table} SET ${setClauses} WHERE id = ?`
    ).bind(...values, body.id).run();

    await _audit(env, payload.login, colName, 'Modificación', `ID ${body.id}`);
    return json({ ok: true });
  }

  async function DELETE(context) {
    const { request, env } = context;
    let payload;
    try { payload = await requireAuth(request, env); } catch(e) { return err(e.message, 401); }
    if (col.adminOnly) { if (!canDo(payload, 'admin')) return err('Sin permisos', 403); }
    else { if (!canDo(payload, 'delete')) return err('Sin permisos', 403); }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return err('ID requerido');

    if (col.table === 'users') {
      if (String(payload.id) === String(id)) return err('No podés eliminar tu propio usuario');
    }

    await env.DB.prepare(`DELETE FROM ${col.table} WHERE id = ?`).bind(id).run();
    await _audit(env, payload.login, colName, 'Eliminación', `ID ${id}`);
    return json({ ok: true });
  }

  return { onRequestGet: GET, onRequestPost: POST, onRequestPut: PUT, onRequestDelete: DELETE };
}

// Auditoría interna
async function _audit(env, usuario, modulo, accion, detalle) {
  await env.DB.prepare(
    `INSERT INTO auditoria (usuario, modulo, accion, detalle) VALUES (?,?,?,?)`
  ).bind(usuario, modulo, accion, detalle||'').run();
}

// snake_case → camelCase
function snakeToCamel(s) {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
