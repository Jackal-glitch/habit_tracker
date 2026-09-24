-- Ultimate Habit Tracker — schéma PostgreSQL
-- À exécuter une fois sur ta base (Vercel Postgres, Neon, Supabase, etc.)

CREATE TABLE IF NOT EXISTS habits (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '✅',
  goal INTEGER NOT NULL DEFAULT 7,       -- objectif : nombre de fois par semaine
  color TEXT NOT NULL DEFAULT '#2dd4bf',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS habit_checks (
  id SERIAL PRIMARY KEY,
  habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  check_date DATE NOT NULL,
  UNIQUE (habit_id, check_date)
);

CREATE INDEX IF NOT EXISTS idx_habit_checks_date ON habit_checks (check_date);
CREATE INDEX IF NOT EXISTS idx_habit_checks_habit ON habit_checks (habit_id);

-- Données d'exemple (facultatif) — reprend les habitudes du template
INSERT INTO habits (name, icon, goal, color, position) VALUES
  ('Drink Water',    '💧', 7, '#2dd4bf', 0),
  ('Workout',        '🏋️', 4, '#f97316', 1),
  ('Read Book',      '📖', 3, '#ef4444', 2),
  ('Meditation',     '🧘', 7, '#a855f7', 3),
  ('No Sugar',       '🚫', 7, '#3b82f6', 4),
  ('Healthy Food',   '🥗', 5, '#2dd4bf', 5),
  ('8+ Hours Sleep', '😴', 7, '#f97316', 6),
  ('Morning Walk',   '🚶', 4, '#ef4444', 7),
  ('Journal',        '📓', 7, '#a855f7', 8),
  ('No Screen Time', '📵', 3, '#3b82f6', 9)
ON CONFLICT DO NOTHING;
