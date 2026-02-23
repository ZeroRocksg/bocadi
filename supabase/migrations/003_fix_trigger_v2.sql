-- Fix definitivo del trigger: usar el patrón oficial de Supabase.
-- security definer set search_path = '' hace que la función corra
-- como postgres (owner), quien tiene BYPASSRLS implícito en Supabase.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  new_workspace_id UUID;
BEGIN
  INSERT INTO public.workspaces (name, owner_id)
  VALUES ('Mi espacio', NEW.id)
  RETURNING id INTO new_workspace_id;

  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;
