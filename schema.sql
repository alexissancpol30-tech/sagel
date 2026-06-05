-- SAGEL — Schema D1 (SQLite compatible)
-- Ejecutar una sola vez al crear la base de datos

CREATE TABLE IF NOT EXISTS users (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  login     TEXT UNIQUE NOT NULL,
  nombre    TEXT,
  pass_hash TEXT NOT NULL,
  rol       TEXT NOT NULL DEFAULT 'consulta',
  estado    TEXT NOT NULL DEFAULT 'activo',
  last_login TEXT
);

CREATE TABLE IF NOT EXISTS expedientes (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  numero           TEXT NOT NULL,
  tipo             TEXT,
  caratula         TEXT NOT NULL,
  autor            TEXT,
  bloque           TEXT,
  fecha_ingreso    TEXT,
  estado_parl      TEXT,
  comision_actual  TEXT,
  comisiones_giro  TEXT,
  obs              TEXT,
  notas_int        TEXT,
  responsable      TEXT,
  prioridad        TEXT DEFAULT 'Media',
  estado_int       TEXT,
  fecha_limite     TEXT,
  fecha_mod        TEXT,
  created_by       TEXT,
  created_at       TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS expediente_archivos (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  expediente_id  INTEGER NOT NULL,
  nombre         TEXT NOT NULL,
  tipo_mime      TEXT,
  tamaño         INTEGER,
  datos          TEXT NOT NULL,  -- base64
  created_at     TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (expediente_id) REFERENCES expedientes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expediente_historial (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  expediente_id  INTEGER NOT NULL,
  usuario        TEXT NOT NULL,
  accion         TEXT NOT NULL,
  fecha          TEXT,
  hora           TEXT,
  created_at     TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (expediente_id) REFERENCES expedientes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sesiones (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha       TEXT NOT NULL,
  tipo        TEXT,
  descripcion TEXT,
  orden       TEXT,
  estado      TEXT DEFAULT 'Programada',
  resultado   TEXT,
  obs         TEXT,
  fecha_mod   TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS comisiones (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre           TEXT NOT NULL,
  pres             TEXT,
  vicepres         TEXT,
  sec              TEXT,
  integrantes      TEXT,
  bloques          TEXT,
  reunion_fecha    TEXT,
  reunion_hora     TEXT,
  reunion_lugar    TEXT,
  reunion_temario  TEXT,
  obs              TEXT,
  fecha_mod        TEXT,
  created_at       TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS minutas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo     TEXT NOT NULL,
  tipo       TEXT,
  fecha      TEXT,
  autor      TEXT,
  contenido  TEXT,
  obs        TEXT,
  fecha_mod  TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS senadores (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre     TEXT NOT NULL,
  bloque     TEXT,
  seccion    TEXT,
  partido    TEXT,
  mandato    TEXT,
  contacto   TEXT,
  comisiones TEXT,
  redes      TEXT,
  obs        TEXT
);

CREATE TABLE IF NOT EXISTS actores (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre      TEXT NOT NULL,
  cat         TEXT,
  cargo       TEXT,
  institucion TEXT,
  contacto    TEXT,
  redes       TEXT,
  obs         TEXT,
  notas       TEXT,
  fecha_mod   TEXT
);

CREATE TABLE IF NOT EXISTS biblioteca (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo    TEXT NOT NULL,
  cat       TEXT,
  año       TEXT,
  url       TEXT,
  tags      TEXT,
  descripcion TEXT,
  fecha_mod TEXT
);

CREATE TABLE IF NOT EXISTS auditoria (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  ts       TEXT DEFAULT (datetime('now')),
  usuario  TEXT NOT NULL,
  modulo   TEXT NOT NULL,
  accion   TEXT NOT NULL,
  detalle  TEXT
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_exp_estado    ON expedientes(estado_parl);
CREATE INDEX IF NOT EXISTS idx_exp_prioridad ON expedientes(prioridad);
CREATE INDEX IF NOT EXISTS idx_exp_numero    ON expedientes(numero);
CREATE INDEX IF NOT EXISTS idx_aud_ts        ON auditoria(ts DESC);
CREATE INDEX IF NOT EXISTS idx_aud_usuario   ON auditoria(usuario);

-- Usuario admin inicial (pass: admin → hash SHA-256 simple para demo)
-- En producción: cambiar contraseña inmediatamente
INSERT OR IGNORE INTO users (login, nombre, pass_hash, rol, estado)
VALUES 
  ('admin',       'Administrador',         'admin',       'admin',      'activo'),
  ('secretario',  'Secretario/a',          'secretario',  'secretario', 'activo'),
  ('asesor',      'Asesor/a',              'asesor',      'asesor',     'activo'),
  ('consulta',    'Solo lectura',          'consulta',    'consulta',   'activo');

-- Datos iniciales senadores
INSERT OR IGNORE INTO senadores (id, nombre, bloque, seccion, mandato) VALUES
(1,'Arata, María Valeria','Fuerza Patria','4','2025–2029'),
(2,'Arietto, María Florencia','La Libertad Avanza','3','2023–2027'),
(3,'Balaudo, Analía','La Libertad Avanza','4','2025–2029'),
(4,'Bambaci, María Luz','La Libertad Avanza','1','2025–2029'),
(5,'Bastida, Sabrina','Fuerza Patria','8','2023–2027'),
(6,'Berni, Sergio Alejandro','Fuerza Patria','2','2023–2027'),
(7,'Borgini, Pedro Francisco','Fuerza Patria','8','2023–2027'),
(8,'Cabezas, Gonzalo','La Libertad Avanza','4','2025–2029'),
(9,'Campbell, Alex','PRO','6','2023–2027'),
(10,'Clark, Laura Magdalena','Fuerza Patria','2','2023–2027'),
(11,'Coronel, Fernando Gabriel','Fuerza Patria','1','2025–2029'),
(12,'Curestis, Carlos Nicolás','La Libertad Avanza','3','2023–2027'),
(13,'Curi, Amira','Fuerza Patria','3','2023–2027'),
(14,'De Urraza, Matías Miguel','La Libertad Avanza','5','2025–2029'),
(15,'Díaz, Evelyn','Fuerza Patria','7','2025–2029'),
(16,'Durán, Ayelén','Fuerza Patria','6','2023–2027'),
(17,'Fagioli, Federico','Fuerza Patria','3','2023–2027'),
(18,'Feliú, Marcelo Enrique','Fuerza Patria','6','2023–2027'),
(19,'Galmarini, Malena','Fuerza Patria','1','2025–2029'),
(20,'González Santalla, Emmanuel S.','Fuerza Patria','3','2023–2027'),
(21,'Ishii, Mario Alberto','Fuerza Patria','1','2025–2029'),
(22,'Kikuchi, Carlos Francisco','Unión y Libertad','2','2023–2027'),
(23,'Lago, Germán','Fuerza Patria','4','2025–2029'),
(24,'Laurini, María Inés','Fuerza Patria','7','2025–2029'),
(25,'Leguizamón Brown, Marcelo','Hechos - UCR Identidad','8','2023–2027'),
(26,'Lopez, Roxana','Fuerza Patria','1','2025–2029'),
(27,'Macha, Mónica Fernanda','Fuerza Patria','1','2025–2029'),
(28,'Martínez, María Cecilia','La Libertad Avanza','5','2025–2029'),
(29,'Martínez, María Rosa','Fuerza Patria','3','2023–2027'),
(30,'Montenegro, Guillermo Tristán','PRO','5','2025–2029'),
(31,'Neumann, Nerina Daniela','UCR','6','2023–2027'),
(32,'Olivera, Luciano Emanuel','La Libertad Avanza','1','2025–2029'),
(33,'Paredi, Jorge Alberto','Fuerza Patria','5','2025–2029'),
(34,'Petrecca, Pablo Alexis','PRO','4','2025–2029'),
(35,'Pirillo, Marisa','La Libertad Avanza','1','2025–2029'),
(36,'Pisano, Marcos Emilio','Fuerza Patria','7','2025–2029'),
(37,'Quintana, Natalia','Hechos - UCR Identidad','4','2025–2029'),
(38,'Raverta, María Fernanda','Fuerza Patria','5','2025–2029'),
(39,'Rico Zini, Juan Manuel','PRO','2','2023–2027'),
(40,'Riva, Betina Clara','La Libertad Avanza','3','2023–2027'),
(41,'Santarelli, Adrián Carlos','Fuerza Patria','3','2023–2027'),
(42,'Schiavone, Jorge','PRO','3','2023–2027'),
(43,'Subiza, María Emilia','Hechos - UCR Identidad','2','2023–2027'),
(44,'Vargas, Sergio Raúl','Unión y Libertad','6','2023–2027'),
(45,'Ventura, Silvana Paola','Unión y Libertad','6','2023–2027'),
(46,'Videla, Diego Alberto','Fuerza Patria','4','2025–2029');

-- Biblioteca inicial
INSERT OR IGNORE INTO biblioteca (id, titulo, cat, año, url, tags, descripcion) VALUES
(1,'Constitución de la Provincia de Buenos Aires','Constitución','1994','https://www.hcdiputados-ba.gov.ar','constitución,fundamental','Texto constitucional vigente de la Provincia de Buenos Aires.'),
(2,'Reglamento del Senado Provincial','Reglamento','2023','','reglamento,procedimiento','Reglamento interno vigente del Senado de la Provincia de Buenos Aires.'),
(3,'Ley Orgánica Municipal N° 6769/58','Ley','1958','','municipios,orgánica','Decreto-Ley Orgánica de las Municipalidades de la Provincia de Buenos Aires.');
