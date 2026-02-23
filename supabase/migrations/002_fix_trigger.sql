-- Fix: la función del trigger necesita bypassar RLS explícitamente
-- ya que Supabase aplica RLS incluso al rol postgres por defecto.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_workspace_id UUID;
BEGIN
  -- Bypass RLS para esta operación de sistema
  SET LOCAL row_security = off;

  INSERT INTO workspaces (name, owner_id)
  VALUES ('Mi espacio', NEW.id)
  RETURNING id INTO new_workspace_id;

  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
