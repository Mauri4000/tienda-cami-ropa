-- ============================================================
-- Tienda Cami — Setup completo (tablas + usuarios)
-- Ejecutar en: Supabase Dashboard → SQL Editor → Run
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── TABLAS ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  role       TEXT        NOT NULL DEFAULT 'vendedor'
               CHECK (role IN ('admin', 'vendedor')),
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clientes (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre     TEXT        NOT NULL,
  ciudad     TEXT        NOT NULL DEFAULT '',
  telefono   TEXT,
  email      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prendas (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre     TEXT        NOT NULL,
  categoria  TEXT        NOT NULL,
  precio     NUMERIC     NOT NULL DEFAULT 0,
  stock      INT         NOT NULL DEFAULT 0,
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ventas (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  date           DATE        NOT NULL,
  total          NUMERIC     NOT NULL DEFAULT 0,
  cliente_id     UUID        REFERENCES clientes(id) ON DELETE SET NULL,
  responsible_id UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS venta_items (
  id               UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  venta_id         UUID    NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  prenda_id        UUID    REFERENCES prendas(id) ON DELETE SET NULL,
  qty              INT     NOT NULL DEFAULT 1,
  precio_unitario  NUMERIC NOT NULL DEFAULT 0
);

-- ─── RLS ────────────────────────────────────────────────────

ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE prendas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE venta_items ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

-- clientes
CREATE POLICY "clientes_all" ON clientes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- prendas
CREATE POLICY "prendas_select" ON prendas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "prendas_insert" ON prendas
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "prendas_update" ON prendas
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "prendas_delete" ON prendas
  FOR DELETE TO authenticated USING (true);

-- ventas
CREATE POLICY "ventas_select" ON ventas
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "ventas_insert" ON ventas
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ventas_delete" ON ventas
  FOR DELETE TO authenticated USING (true);

-- venta_items
CREATE POLICY "venta_items_select" ON venta_items
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "venta_items_insert" ON venta_items
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "venta_items_delete" ON venta_items
  FOR DELETE TO authenticated USING (true);

-- ─── TRIGGER: auto-crear profile al registrar usuario ───────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'vendedor'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── USUARIOS ───────────────────────────────────────────────
--
--   Mauri  →  mauri@cami.bo   /  Mauri@25
--   Cami   →  cami@cami.bo    /  Cami@25
--

DO $$
DECLARE
  mauri_id uuid := gen_random_uuid();
  cami_id  uuid := gen_random_uuid();
BEGIN

  -- ── Mauri ──────────────────────────────────────────────────
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    mauri_id, 'authenticated', 'authenticated',
    'mauri@cami.bo',
    crypt('Mauri@25', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Mauri"}',
    false, '', '', '', ''
  );
  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), mauri_id, 'mauri@cami.bo',
    jsonb_build_object('sub', mauri_id::text, 'email', 'mauri@cami.bo'),
    'email', NOW(), NOW(), NOW()
  );

  -- ── Cami ───────────────────────────────────────────────────
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    cami_id, 'authenticated', 'authenticated',
    'cami@cami.bo',
    crypt('Cami@25', gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Cami"}',
    false, '', '', '', ''
  );
  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), cami_id, 'cami@cami.bo',
    jsonb_build_object('sub', cami_id::text, 'email', 'cami@cami.bo'),
    'email', NOW(), NOW(), NOW()
  );

END $$;

-- ─── Mauri = admin ──────────────────────────────────────────
UPDATE profiles SET role = 'admin' WHERE email = 'mauri@cami.bo';
