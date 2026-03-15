-- ==========================================
-- RLS POLICIES FOR GYMFLOW
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE clases ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- 1. USUARIOS Table
-- Superadmin can see everything
DROP POLICY IF EXISTS "Superadmins can do everything on usuarios" ON usuarios;
CREATE POLICY "Superadmins can do everything on usuarios" ON usuarios FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'superadmin')
);

-- Admin/Coach can see users of their gym
DROP POLICY IF EXISTS "Admins/Coaches can see their gym users" ON usuarios;
CREATE POLICY "Admins/Coaches can see their gym users" ON usuarios FOR SELECT TO authenticated USING (
  gym_id = (SELECT gym_id FROM usuarios WHERE id = auth.uid())
);

-- Users can see their own profile
DROP POLICY IF EXISTS "Users can see their own profile" ON usuarios;
CREATE POLICY "Users can see their own profile" ON usuarios FOR SELECT TO authenticated USING (
  id = auth.uid()
);

-- 2. GYMS Table
-- Superadmin can do everything
DROP POLICY IF EXISTS "Superadmins can do everything on gyms" ON gyms;
CREATE POLICY "Superadmins can do everything on gyms" ON gyms FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'superadmin')
);

-- authenticated can read gyms (for registration)
DROP POLICY IF EXISTS "Anyone authenticated can read active gyms" ON gyms;
CREATE POLICY "Anyone authenticated can read active gyms" ON gyms FOR SELECT TO authenticated USING (
  estado = 'active' OR estado = 'trial'
);

-- 3. CLASES Table
-- Anyone in the same gym can read classes
DROP POLICY IF EXISTS "Users can read their gym classes" ON clases;
CREATE POLICY "Users can read their gym classes" ON clases FOR SELECT TO authenticated USING (
  gym_id = (SELECT gym_id FROM usuarios WHERE id = auth.uid()) OR 
  EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'superadmin')
);

-- Admin/Coach can manage classes
DROP POLICY IF EXISTS "Admins/Coaches can manage classes" ON clases;
CREATE POLICY "Admins/Coaches can manage classes" ON clases FOR ALL TO authenticated USING (
  (gym_id = (SELECT gym_id FROM usuarios WHERE id = auth.uid()) AND 
   EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol IN ('admin', 'coach')))
);

-- 4. RESERVAS Table
-- Users can manage their own reservations
DROP POLICY IF EXISTS "Users can manage their own reservations" ON reservas;
CREATE POLICY "Users can manage their own reservations" ON reservas FOR ALL TO authenticated USING (
  usuario_id = auth.uid()
);

-- Admin/Coach can see all reservations of their gym
DROP POLICY IF EXISTS "Admins/Coaches can see gym reservations" ON reservas;
CREATE POLICY "Admins/Coaches can see gym reservations" ON reservas FOR SELECT TO authenticated USING (
  gym_id = (SELECT gym_id FROM usuarios WHERE id = auth.uid())
);

-- 5. PAGOS Table
-- Users can see their own payments
DROP POLICY IF EXISTS "Users can see their own payments" ON pagos;
CREATE POLICY "Users can see their own payments" ON pagos FOR SELECT TO authenticated USING (
  usuario_id = auth.uid()
);

-- Admin can manage payments
DROP POLICY IF EXISTS "Admins can manage payments" ON pagos;
CREATE POLICY "Admins can manage payments" ON pagos FOR ALL TO authenticated USING (
  (gym_id = (SELECT gym_id FROM usuarios WHERE id = auth.uid()) AND 
   EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND rol = 'admin'))
);
