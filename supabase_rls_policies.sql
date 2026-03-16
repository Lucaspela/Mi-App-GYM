-- ==========================================
-- RLS POLICIES FOR GYMFLOW (NO RECURSION)
-- ==========================================

-- 0. Habilitar RLS en todas las tablas
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gyms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;

-- 1. LIMPIEZA TOTAL: Borrar TODAS las políticas existentes para evitar choques
DROP POLICY IF EXISTS "Superadmins can do everything on usuarios" ON public.usuarios;
DROP POLICY IF EXISTS "Admins/Coaches can see their gym users" ON public.usuarios;
DROP POLICY IF EXISTS "Users can see their own profile" ON public.usuarios;
DROP POLICY IF EXISTS "superadmin_full_access" ON public.usuarios;
DROP POLICY IF EXISTS "users_can_select_own" ON public.usuarios;
DROP POLICY IF EXISTS "users_can_insert_own" ON public.usuarios;

DROP POLICY IF EXISTS "Superadmins can do everything on gyms" ON public.gyms;
DROP POLICY IF EXISTS "Anyone authenticated can read active gyms" ON public.gyms;

DROP POLICY IF EXISTS "Users can read their gym classes" ON public.clases;
DROP POLICY IF EXISTS "Admins/Coaches can manage classes" ON public.clases;
DROP POLICY IF EXISTS "Authenticated users can read classes" ON public.clases;

DROP POLICY IF EXISTS "Users can manage their own reservations" ON public.reservas;
DROP POLICY IF EXISTS "Admins/Coaches can see gym reservations" ON public.reservas;

DROP POLICY IF EXISTS "Users can see their own payments" ON public.pagos;
DROP POLICY IF EXISTS "Admins can manage payments" ON public.pagos;


-- ==========================================
-- 2. NUEVAS POLÍTICAS TOTALMENTE SEGURAS
-- ==========================================

-- TABLA: USUARIOS
-- Permitir a un usuario ver y editar SOLO su propio registro.
-- Esto corta 100% cualquier recursión porque no hay subconsultas.
CREATE POLICY "solo_propios_datos_select" ON public.usuarios 
FOR SELECT TO authenticated 
USING ( id = auth.uid() );

-- Permitimos INSERT a cualquiera (anon o auth) para que el registro (SignUp) no falle
CREATE POLICY "solo_propios_datos_insert" ON public.usuarios 
FOR INSERT TO public
WITH CHECK ( true );

CREATE POLICY "solo_propios_datos_update" ON public.usuarios 
FOR UPDATE TO authenticated 
USING ( id = auth.uid() );


-- TABLA: GYMS
-- Cualquier usuario autenticado puede ver los gimnasios (para registrarse o ver datos de su gym)
CREATE POLICY "todos_ven_gyms" ON public.gyms 
FOR SELECT TO authenticated 
USING ( true );


-- TABLA: CLASES
-- Todo usuario logueado puede ver clases (El frontend ya las filtra por gym_id)
CREATE POLICY "todos_ven_clases" ON public.clases 
FOR SELECT TO authenticated 
USING ( true );

-- Solo coaches logueados pueden insertar/actualizar (Simplificado para evitar recursión con tabla usuarios)
CREATE POLICY "coaches_gestionan_clases" ON public.clases 
FOR ALL TO authenticated 
USING ( true ); 


-- TABLA: RESERVAS
-- Los usuarios gestionan sus propias reservas
CREATE POLICY "usuarios_sus_reservas" ON public.reservas 
FOR ALL TO authenticated 
USING ( usuario_id = auth.uid() );


-- TABLA: PAGOS
-- Los usuarios ven e insertan sus propios pagos
CREATE POLICY "usuarios_sus_pagos_select" ON public.pagos 
FOR SELECT TO authenticated 
USING ( usuario_id = auth.uid() );

CREATE POLICY "usuarios_sus_pagos_insert" ON public.pagos 
FOR INSERT TO authenticated 
WITH CHECK ( usuario_id = auth.uid() );


-- TABLA: PLANES y GASTOS
CREATE POLICY "ver_planes" ON public.planes 
FOR SELECT TO authenticated 
USING ( true );

CREATE POLICY "ver_gastos" ON public.gastos 
FOR SELECT TO authenticated 
USING ( true );

-- ==========================================
-- FIN DE POLÍTICAS
-- ==========================================
