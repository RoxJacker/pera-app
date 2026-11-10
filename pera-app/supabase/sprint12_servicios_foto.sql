-- ==============================================================
-- Belleza Pera — Sprint 4: Fotos de Servicios
-- ==============================================================
-- 1. Agregar columna foto_url a la tabla de servicios
ALTER TABLE public.servicios ADD COLUMN IF NOT EXISTS foto_url TEXT DEFAULT NULL;

-- 2. Asegurar que las políticas de storage permitan lectura y subida
-- (Los buckets 'productos-fotos' o 'servicios-fotos' pueden almacenar las imágenes)
INSERT INTO storage.buckets (id, name, public)
VALUES ('servicios-fotos', 'servicios-fotos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Permitir subida pública de fotos de servicios" ON storage.objects;
CREATE POLICY "Permitir subida pública de fotos de servicios"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id IN ('productos-fotos', 'servicios-fotos'));

DROP POLICY IF EXISTS "Permitir lectura pública de fotos de servicios" ON storage.objects;
CREATE POLICY "Permitir lectura pública de fotos de servicios"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id IN ('productos-fotos', 'servicios-fotos'));

DROP POLICY IF EXISTS "Permitir actualizar fotos de servicios" ON storage.objects;
CREATE POLICY "Permitir actualizar fotos de servicios"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id IN ('productos-fotos', 'servicios-fotos'));

