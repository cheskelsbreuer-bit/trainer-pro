-- Nutrition coach — body measurements on weekly check-ins.
--
-- Real coaches track more than weight: waist, hip, chest. Some clients
-- also send a progress photo. This migration adds those four columns
-- to nutrition_check_ins so the trend chart on client-detail can show
-- multiple data series, and a photo can be attached per week.
--
-- The photo_url field will be filled by Supabase Storage in a later
-- iteration; for now coaches can paste any image URL and it'll render.

alter table public.nutrition_check_ins
  add column if not exists waist_in numeric,
  add column if not exists hip_in numeric,
  add column if not exists chest_in numeric,
  add column if not exists photo_url text;
