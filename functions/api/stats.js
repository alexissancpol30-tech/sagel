// functions/api/stats.js
import { requireAuth, json, err } from './_auth.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  try { await requireAuth(request, env); } catch(e) { return err(e.message, 401); }

  const today = new Date().toISOString().slice(0, 10);
  const sevenDays = new Date(); sevenDays.setDate(sevenDays.getDate() + 7);
  const sevenDaysStr = sevenDays.toISOString().slice(0, 10);

  const [
    totalExp, prioritarios, pendientes, sesionesProx,
    vencidos, porVencer, byEstado, byPrioridad, byTipo,
    recentAudit, proximasReuniones
  ] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) as n FROM expedientes`).first(),
    env.DB.prepare(`SELECT COUNT(*) as n FROM expedientes WHERE prioridad = 'Alta'`).first(),
    env.DB.prepare(`SELECT COUNT(*) as n FROM expedientes WHERE estado_int = 'Pendiente revisión'`).first(),
    env.DB.prepare(`SELECT COUNT(*) as n FROM sesiones WHERE estado = 'Programada' AND fecha >= ?`).bind(today).first(),
    env.DB.prepare(`SELECT id, numero, caratula, fecha_limite FROM expedientes WHERE fecha_limite < ? AND fecha_limite != '' AND estado_int != 'Cerrado' ORDER BY fecha_limite ASC LIMIT 5`).bind(today).all(),
    env.DB.prepare(`SELECT id, numero, caratula, fecha_limite FROM expedientes WHERE fecha_limite >= ? AND fecha_limite <= ? AND estado_int != 'Cerrado' ORDER BY fecha_limite ASC LIMIT 5`).bind(today, sevenDaysStr).all(),
    env.DB.prepare(`SELECT estado_parl, COUNT(*) as n FROM expedientes GROUP BY estado_parl ORDER BY n DESC`).all(),
    env.DB.prepare(`SELECT prioridad, COUNT(*) as n FROM expedientes GROUP BY prioridad`).all(),
    env.DB.prepare(`SELECT tipo, COUNT(*) as n FROM expedientes GROUP BY tipo ORDER BY n DESC`).all(),
    env.DB.prepare(`SELECT ts, usuario, modulo, accion FROM auditoria ORDER BY ts DESC LIMIT 8`).all(),
    env.DB.prepare(`SELECT id, nombre, reunion_fecha, reunion_hora FROM comisiones WHERE reunion_fecha >= ? ORDER BY reunion_fecha ASC LIMIT 5`).bind(today).all(),
  ]);

  return json({
    ok: true,
    data: {
      kpi: {
        totalExp:       totalExp.n,
        prioritarios:   prioritarios.n,
        pendientes:     pendientes.n,
        sesionesProx:   sesionesProx.n,
      },
      alertas: {
        vencidos:  vencidos.results,
        porVencer: porVencer.results,
      },
      charts: {
        byEstado:    byEstado.results,
        byPrioridad: byPrioridad.results,
        byTipo:      byTipo.results,
      },
      recentAudit:      recentAudit.results,
      proximasReuniones: proximasReuniones.results,
    }
  });
}
