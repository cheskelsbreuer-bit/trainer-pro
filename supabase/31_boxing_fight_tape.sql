-- Boxing — extend the fights table with the opponent's tale of the tape
-- (record, height, reach, age, stance). Real boxing apps emphasize the
-- fighter-vs-fighter comparison; without these columns the fight poster
-- only shows one side.
--
-- All columns are nullable so existing rows (and rows where the opponent
-- is still TBD) keep working.

alter table public.boxing_fights
  add column if not exists opponent_record text,
  add column if not exists opponent_height_in integer,
  add column if not exists opponent_reach_in integer,
  add column if not exists opponent_age integer,
  add column if not exists opponent_stance text;
