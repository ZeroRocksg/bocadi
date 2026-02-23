-- ============================================================
-- BOCADI — Schema inicial
-- Ejecutar en: Supabase SQL Editor
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. TABLAS
-- ─────────────────────────────────────────────────────────────

-- Workspaces (espacios compartidos entre usuarios)
CREATE TABLE IF NOT EXISTS workspaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  owner_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Membresía de usuarios en workspaces
CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role          TEXT CHECK (role IN ('owner', 'member')) DEFAULT 'member',
  PRIMARY KEY (workspace_id, user_id)
);

-- Tipos de proteína con color
CREATE TABLE IF NOT EXISTS protein_types (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  color         TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Catálogo de platos
CREATE TABLE IF NOT EXISTS dishes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  protein_type_id UUID REFERENCES protein_types(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  image_url       TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Ingredientes por plato
CREATE TABLE IF NOT EXISTS ingredients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id         UUID REFERENCES dishes(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  quantity        NUMERIC,
  unit            TEXT,
  estimated_cost  NUMERIC DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Plan semanal
CREATE TABLE IF NOT EXISTS week_plan_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  dish_id       UUID REFERENCES dishes(id) ON DELETE CASCADE,
  week_start    DATE NOT NULL,
  day_of_week   TEXT CHECK (day_of_week IN (
                  'monday','tuesday','wednesday',
                  'thursday','friday','saturday','sunday')),
  meal_slot     TEXT CHECK (meal_slot IN ('breakfast','lunch','dinner')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 2. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

ALTER TABLE workspaces         ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE protein_types      ENABLE ROW LEVEL SECURITY;
ALTER TABLE dishes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients        ENABLE ROW LEVEL SECURITY;
ALTER TABLE week_plan_entries  ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 3. POLÍTICAS RLS
-- ─────────────────────────────────────────────────────────────

-- Helper: saber si el usuario es miembro del workspace
CREATE OR REPLACE FUNCTION is_workspace_member(ws_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = ws_id
      AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- workspaces
CREATE POLICY "workspace_select" ON workspaces
  FOR SELECT USING (is_workspace_member(id));

CREATE POLICY "workspace_insert" ON workspaces
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspace_update" ON workspaces
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "workspace_delete" ON workspaces
  FOR DELETE USING (owner_id = auth.uid());

-- workspace_members
CREATE POLICY "members_select" ON workspace_members
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "members_insert" ON workspace_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspaces
      WHERE id = workspace_id AND owner_id = auth.uid()
    )
    OR user_id = auth.uid()  -- permitir unirse si tiene invite
  );

CREATE POLICY "members_delete" ON workspace_members
  FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM workspaces
      WHERE id = workspace_id AND owner_id = auth.uid()
    )
  );

-- protein_types
CREATE POLICY "protein_types_all" ON protein_types
  FOR ALL USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

-- dishes
CREATE POLICY "dishes_all" ON dishes
  FOR ALL USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

-- ingredients
CREATE POLICY "ingredients_all" ON ingredients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM dishes d
      WHERE d.id = dish_id
        AND is_workspace_member(d.workspace_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dishes d
      WHERE d.id = dish_id
        AND is_workspace_member(d.workspace_id)
    )
  );

-- week_plan_entries
CREATE POLICY "week_plan_all" ON week_plan_entries
  FOR ALL USING (is_workspace_member(workspace_id))
  WITH CHECK (is_workspace_member(workspace_id));

-- ─────────────────────────────────────────────────────────────
-- 4. TRIGGER: workspace personal al registrarse
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_workspace_id UUID;
BEGIN
  -- Crear workspace personal
  INSERT INTO workspaces (name, owner_id)
  VALUES ('Mi espacio', NEW.id)
  RETURNING id INTO new_workspace_id;

  -- Agregar al usuario como owner
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar trigger si ya existe (para idempotencia)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
