-- =====================================================================
--  Set every product description to its SELLING size (thickness x width x length, mm).
--  e.g. 15 x 70 x 1000mm. Run in the Neon SQL Editor. Re-runnable.
--  To only fill BLANK descriptions, add:  where description is null or btrim(description) = ''
-- =====================================================================
update products
set description =
  concat_ws(' x ',
    nullif(trim_scale(coalesce(thickness_mm, 0)), 0)::text,
    nullif(trim_scale(coalesce(width_mm, 0)), 0)::text,
    nullif(trim_scale(coalesce(length_mm, 0)), 0)::text
  ) || 'mm';
