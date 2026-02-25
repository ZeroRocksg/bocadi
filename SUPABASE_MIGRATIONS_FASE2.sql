-- ============================================================
-- BOCADI FASE 2 — Migraciones Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Columna de calorías en ingredientes
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS estimated_kcal NUMERIC DEFAULT 0;

-- 2. Tabla de meal slots personalizados por workspace
CREATE TABLE IF NOT EXISTS meal_slots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 99,
  is_default    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla para ocultar slots en semanas específicas
CREATE TABLE IF NOT EXISTS meal_slot_hidden_weeks (
  meal_slot_id  UUID REFERENCES meal_slots(id) ON DELETE CASCADE,
  workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  week_start    DATE NOT NULL,
  PRIMARY KEY (meal_slot_id, week_start)
);

-- 4. Habilitar RLS
ALTER TABLE meal_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_slot_hidden_weeks ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para meal_slots
CREATE POLICY "Members can read meal_slots" ON meal_slots
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can insert meal_slots" ON meal_slots
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can delete meal_slots" ON meal_slots
  FOR DELETE USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- 6. Políticas RLS para meal_slot_hidden_weeks
CREATE POLICY "Members can manage hidden weeks" ON meal_slot_hidden_weeks
  FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- 7. Agregar columna meal_slot_id a week_plan_entries
ALTER TABLE week_plan_entries
  ADD COLUMN IF NOT EXISTS meal_slot_id UUID REFERENCES meal_slots(id);

-- 8. Insertar slots base para workspaces existentes
INSERT INTO meal_slots (workspace_id, name, sort_order, is_default)
SELECT w.id, s.name, s.sort_order, TRUE
FROM workspaces w
CROSS JOIN (VALUES
  ('Desayuno', 1),
  ('Almuerzo', 2),
  ('Cena',     3)
) AS s(name, sort_order)
ON CONFLICT DO NOTHING;

-- 9. Migrar entradas existentes (meal_slot texto → meal_slot_id UUID)
UPDATE week_plan_entries wpe
SET meal_slot_id = ms.id
FROM meal_slots ms
WHERE ms.workspace_id = wpe.workspace_id
  AND ms.name = CASE
    WHEN wpe.meal_slot = 'breakfast' THEN 'Desayuno'
    WHEN wpe.meal_slot = 'lunch'     THEN 'Almuerzo'
    WHEN wpe.meal_slot = 'dinner'    THEN 'Cena'
  END
  AND wpe.meal_slot_id IS NULL;

-- 10. Trigger: crear slots por defecto al crear un workspace
CREATE OR REPLACE FUNCTION create_default_meal_slots()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO meal_slots (workspace_id, name, sort_order, is_default) VALUES
    (NEW.id, 'Desayuno', 1, TRUE),
    (NEW.id, 'Almuerzo', 2, TRUE),
    (NEW.id, 'Cena',     3, TRUE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_default_meal_slots ON workspaces;
CREATE TRIGGER trigger_create_default_meal_slots
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION create_default_meal_slots();

-- ============================================================
-- FIN DE MIGRACIONES
-- ============================================================
