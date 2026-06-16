-- Auto-generated from Stock List (UD1334).csv
-- Run AFTER schema-timber.sql. Safe to re-run (upserts).

-- Locations -------------------------------------------------------
insert into locations (name) values
  ('CARDIFF'),
  ('SUTTON BRIDGE'),
  ('UNALLOCATED'),
  ('WISBECH')
on conflict (name) do nothing;

-- Products (selling dims + GBP avg cost; sell rate set later) ------
insert into products (code, description, thickness_mm, width_mm, length_mm, ppp, stocking_unit, avg_cost_per_m3) values
  ('104-120', '15 x 85 x 1200', 15, 85, 1200, 780, 'pack', 170.11),
  ('106-120', '15 x 85 x 1200', 15, 85, 1200, 780, 'pack', 169.89),
  ('107-118', '42 x 60 x 1180', 42, 60, 1180, 391, 'pack', 228.17),
  ('107-120', '42 x 60 x 1200', 42, 60, 1200, 391, 'pack', 199.58),
  ('107-962', '42 x 60 x 962', 42, 60, 962, 391, 'pack', 199.42),
  ('107-995', '42 x 60 x 995', 42, 60, 995, 391, 'pack', 202.04),
  ('108-575', '42 x 70 x 575', 42, 70, 575, 690, 'pack', 197.9),
  ('108-965', '42 x 70 x 965', 42, 70, 965, 345, 'pack', 198.16),
  ('111-930', '42 x 50 x 930', 42, 50, 930, 483, 'pack', 244.52),
  ('112-800', '50 x 50 x 800', 50, 50, 800, 441, 'pack', 180.35),
  ('114-100', '30 x 70 x 1000', 30, 70, 1000, 450, 'pack', 153.77),
  ('115-120', '35 x 90 x 1200', 35, 90, 1200, 336, 'pack', 177.97),
  ('119-100SW/A', '30 x 90 x 1000', 30, 90, 1000, 360, 'pack', 156.16),
  ('119-100WW', '30 x 90 x 1000', 30, 90, 1000, 360, 'pack', 168.06),
  ('119-102', '30 x 90 x 1020', 30, 90, 1020, 360, 'pack', 164.12),
  ('119-120', '30 x 90 x 1200', 30, 90, 1200, 360, 'pack', 159.95),
  ('119-950', '30 x 90 x 950', 30, 90, 950, 360, 'pack', 198.92),
  ('120-1155', '28 x 85 x 1155', 28, 85, 1155, 348, 'pack', 231.11),
  ('123-205SW/A', '35 x 70 x 2050', 35, 70, 2050, 420, 'pack', 168.46),
  ('123-250SW/A', '35 x 70 x 2500', 35, 70, 2500, 420, 'pack', 346.69),
  ('123-860', '35 x 70 x 860', 35, 70, 860, 420, 'pack', 212.81),
  ('129-575', '38 x 70 x 575', 38, 70, 575, 750, 'pack', 198.84),
  ('129-605', '38 x 70 x 605', 38, 70, 605, 750, 'pack', 276.76),
  ('131-100', '16 x 75 x 1000', 16, 75, 1000, 840, 'pack', 192.08),
  ('137-650', '40 x 70 x 650', 40, 70, 650, 720, 'pack', 412.98),
  ('152-900', '47 x 63 x 900', 47, 63, 900, 340, 'pack', 207.12),
  ('163-240', '44 x 70 x 2400', 44, 70, 2400, 330, 'pack', 188.11),
  ('16X75X2400 P1 KD', '16 x 75 x 2400', 16, 75, 2400, 845, 'pack', 177.37),
  ('16X75X3000 P1 KD', '16 x 75 x 3000', 16, 75, 3000, 845, 'pack', 202.63),
  ('17-100', '15 x 90 x 1000', 15, 90, 1000, 720, 'pack', 158.54),
  ('17-100/B', '15 x 90 x 1000', 15, 90, 1000, 720, 'pack', 174.9),
  ('17-102', '15 x 90 x 1020', 15, 90, 1020, 720, 'pack', 243.64),
  ('17-105', '15 x 90 x 1050', 15, 90, 1050, 733, 'pack', 206.73),
  ('17-106', '15 x 90 x 1060', 15, 90, 1060, 720, 'pack', 170.5),
  ('17-120', '15 x 90 x 1200', 15, 90, 1200, 720, 'pack', 169.66),
  ('17-120SW/A', '15 x 90 x 1200', 15, 90, 1200, 660, 'pack', 185.05),
  ('17-210', '15 x 90 x 2100', 15, 90, 2100, 720, 'pack', 231.1),
  ('17-845', '15 x 90 x 845', 15, 90, 845, 720, 'pack', 193.37),
  ('17-900', '15 x 90 x 900', 15, 90, 900, 720, 'pack', 185.82),
  ('19-260SW/A', '18 x 75 x 2600', 18, 75, 2600, 280, 'pack', 202.04),
  ('19-305SW/A', '18 x 75 x 3050', 18, 75, 3050, 770, 'pack', 203.94),
  ('20-845', '15 x 90 x 845', 15, 90, 845, 720, 'pack', 208.59),
  ('22X100X4200 P1 KD', '22 x 100 x 4200', 22, 100, 4200, 440, 'pack', 202.31),
  ('22X100X4800 P1 KD', '22 x 100 x 4800', 22, 100, 4800, 430, 'pack', 216.42),
  ('22X100X5400 P1 KD', '22 x 100 x 5400', 22, 100, 5400, 430, 'pack', 202.35),
  ('22X75X3000 P1 KD', '22 x 75 x 3000', 22, 75, 3000, 650, 'pack', 174.79),
  ('22X75X3600 P1 KD', '22 x 75 x 3600', 22, 75, 3600, 650, 'pack', 174.83),
  ('402-120', '60 x 70 x 1200', 60, 70, 1200, 240, 'pack', 213.77),
  ('450-103', '70 x 90 x 1030', 70, 90, 1030, 96, 'pack', 198.39),
  ('450-120', '70 x 90 x 1200', 70, 90, 1200, 156, 'pack', 158.37),
  ('450-135', '70 x 90 x 1350', 70, 90, 1350, 156, 'pack', 197.74),
  ('450-137', '70 x 90 x 1370', 70, 90, 1370, 156, 'pack', 197.45),
  ('450-240', '70 x 90 x 2400', 70, 90, 2400, 156, 'pack', 183.91),
  ('47-240SW/BR', '100 x 100 x 2400', 100, 100, 2400, 99, 'pack', 272.5),
  ('47-240SW/G', '100 x 100 x 2400', 100, 100, 2400, 99, 'pack', 229.75),
  ('47-300SW/BR', '100 x 100 x 3000', 100, 100, 3000, 99, 'pack', 236.55),
  ('47-300SW/G', '100 x 100 x 3000', 100, 100, 3000, 99, 'pack', 229.8),
  ('47X100X3000 KD/HT', '47 x 100 x 3000', 47, 100, 3000, 117, 'pack', 0),
  ('500-105', '70 x 70 x 1050', 70, 70, 1050, 195, 'pack', 191.27),
  ('500-110', '70 x 70 x 1100', 70, 70, 1100, 195, 'pack', 154.03),
  ('500-120', '70 x 70 x 1200', 70, 70, 1200, 173, 'pack', 188.24),
  ('500-120SW/A', '70 x 70 x 1200', 70, 70, 1200, 195, 'pack', 165.25),
  ('500-125', '70 x 70 x 1250', 70, 70, 1250, 195, 'pack', 255.44),
  ('500-150SW/A', '70 x 70 x 1500', 70, 70, 1500, 195, 'pack', 165),
  ('500-240/F3', '70 x 70 x 2400', 70, 70, 2400, 195, 'pack', 156.8),
  ('500-240SW/A', '70 x 70 x 2400', 70, 70, 2400, 195, 'pack', 165.03),
  ('500-300/F3', '70 x 70 x 3000', 70, 70, 3000, 195, 'pack', 248.72),
  ('500-300/SL', '70 x 70 x 3000', 70, 70, 3000, 195, 'pack', 174.56),
  ('500-300SW F2', '70 x 70 x 3000', 70, 70, 3000, 196, 'pack', 0),
  ('500-300SW/A', '70 x 70 x 3000', 70, 70, 3000, 195, 'pack', 188.35),
  ('500-700', '70 x 70 x 700', 70, 70, 700, 390, 'pack', 161.02),
  ('500-750SW/A', '70 x 70 x 750', 70, 70, 750, 195, 'pack', 153.95),
  ('500-900/SL', '70 x 70 x 900', 70, 70, 900, 195, 'pack', 253.7),
  ('500-975AL', '70 x 70 x 975', 70, 70, 975, 195, 'pack', 196.43),
  ('901-120W', '75 x 150 x 1200', 75, 150, 1200, 84, 'pack', 270.08),
  ('9-100', '15 x 70 x 1000', 15, 70, 1000, 900, 'pack', 147.16),
  ('9-100/B', '15 x 70 x 1000', 15, 70, 1000, 900, 'pack', 186.33),
  ('9-106', '15 x 70 x 1060', 15, 70, 1060, 900, 'pack', 202.28),
  ('9-120', '15 x 70 x 1200', 15, 70, 1200, 900, 'pack', 187.68),
  ('9-120/B', '15 x 70 x 1200', 15, 70, 1200, 900, 'pack', 147.59),
  ('9-120SW/A', '15 x 70 x 1200', 15, 70, 1200, 900, 'pack', 268.24),
  ('9-136', '15 x 70 x 1360', 15, 70, 1360, 900, 'pack', 183.56),
  ('9-150', '15 x 70 x 1500', 15, 70, 1500, 900, 'pack', 235.68),
  ('9-200', '15 x 70 x 2000', 15, 70, 2000, 900, 'pack', 167.79),
  ('9-800', '15 x 70 x 800', 15, 70, 800, 900, 'pack', 265.7),
  ('AJO-610SW', '6 x 21 x 610', 6, 21, 610, 12000, 'pack', 407.29),
  ('AT-100SW/A', '15 x 90 x 1000', 15, 90, 1000, 720, 'pack', 206.78),
  ('AT-120SW/A', '15 x 90 x 1200', 15, 90, 1200, 720, 'pack', 199.85),
  ('ATS-100SW/A', '12 x 70 x 1000', 12, 70, 1000, null, 'pack', null),
  ('JE-1175SW', '10 x 21 x 1175', 10, 21, 1175, 4940, 'pack', 366.8),
  ('JET-100SW/A', '15 x 95 x 1000', 15, 95, 1000, 660, 'pack', 228.32),
  ('JET-110SW/A', '15 x 95 x 1100', 15, 95, 1100, 660, 'pack', 206.28),
  ('JET-120SW/A', '15 x 95 x 1200', 15, 95, 1200, 660, 'pack', 233.14),
  ('JMJ-120SW/A', '15 x 75 x 1200', 15, 75, 1200, 840, 'pack', 204.37),
  ('JT-120SW/A', '15 x 70 x 1200', 15, 70, 1200, 900, 'pack', 196.7),
  ('P1 F2-2400', '16 x 75 x 2400', 16, 75, 2400, 700, 'pack', 168.11),
  ('P1 F2-3000', '16 x 75 x 3000', 16, 75, 3000, 700, 'pack', 159.13),
  ('P1 F2-3600', '16 x 75 x 3600', 16, 75, 3600, 700, 'pack', 160.25),
  ('P1 F2-4800', '16 x 75 x 4800', 16, 75, 4800, 700, 'pack', 181.89),
  ('P1-F2-3000', '16 x 75 x 3000', 16, 75, 3000, 700, 'pack', 174.8),
  ('P1-F2-3600', '16 x 75 x 3600', 16, 75, 3600, 700, 'pack', 174.74),
  ('P2 F2-3000', '16 x 100 x 3000', 16, 100, 3000, 550, 'pack', 161.87),
  ('P2 F2-3600', '16 x 100 x 3600', 16, 100, 3600, 550, 'pack', 161.67),
  ('P2-1000 KD/HT', '16 x 100 x 1000', 16, 100, 1000, 690, 'pack', 202.54),
  ('P2-1200 KD/HT', '16 x 100 x 1200', 16, 100, 1200, 660, 'pack', 200.43),
  ('P2-800 KD/HT', '16 x 100 x 800', 16, 100, 800, 690, 'pack', 197.99),
  ('SC204-100', '6 x 22 x 1000', 6, 22, 1000, 7500, 'pack', 336.67),
  ('SC500-960SW/F3', '70 x 70 x 960', 70, 70, 960, 195, 'pack', 199.73),
  ('SC9-100/B', '15 x 70 x 1000', 15, 70, 1000, 900, 'pack', 179.67),
  ('SC9-120/B', '15 x 70 x 1200', 15, 70, 1200, 900, 'pack', 180.62),
  ('SLP2-240SW/B.', '100 x 200 x 2400', 100, 200, 2400, 50, 'pack', 0),
  ('SLP2-240SW/G.', '100 x 200 x 2400', 100, 200, 2400, 50, 'pack', 0),
  ('SLP3-240SW/B/F3', '95 x 195 x 2400', 95, 195, 2400, 50, 'pack', 232.24),
  ('SLP3-240SW/G/F3', '95 x 195 x 2400', 95, 195, 2400, 50, 'pack', 282.75),
  ('VU-19038-4200/SW/KD/P1', '19 x 38 x 4200', 19, 38, 4200, 700, 'pack', 216.02),
  ('Total', '', null, null, null, null, 'pack', 187.28)
on conflict (code) do nothing;

-- Stock on hand per product + location ----------------------------
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 3, 3.58, 170.11 from products p, locations l where p.code='104-120' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 30, 35.8, 169.89 from products p, locations l where p.code='106-120' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 8, 9.3, 228.17 from products p, locations l where p.code='107-118' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 10, 11.82, 199.58 from products p, locations l where p.code='107-120' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 11, 10.26, 199.42 from products p, locations l where p.code='107-962' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 3, 2.94, 202.04 from products p, locations l where p.code='107-995' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 4, 4.77, 197.9 from products p, locations l where p.code='108-575' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 5, 4.89, 198.16 from products p, locations l where p.code='108-965' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 6, 5.66, 244.52 from products p, locations l where p.code='111-930' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 9, 7.94, 180.35 from products p, locations l where p.code='112-800' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 42, 39.69, 153.77 from products p, locations l where p.code='114-100' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 35, 83.83, 177.97 from products p, locations l where p.code='115-120' and l.name='WISBECH'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 31, 83.83, 177.97 from products p, locations l where p.code='115-120' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 3, 2.92, 156.16 from products p, locations l where p.code='119-100SW/A' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 20, 19.44, 168.06 from products p, locations l where p.code='119-100WW' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 12, 11.9, 164.12 from products p, locations l where p.code='119-102' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 10, 11.66, 159.95 from products p, locations l where p.code='119-120' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 5, 4.62, 198.92 from products p, locations l where p.code='119-950' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 50, 47.83, 231.11 from products p, locations l where p.code='120-1155' and l.name='WISBECH'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 9, 18.99, 168.46 from products p, locations l where p.code='123-205SW/A' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 1, 2.57, 346.69 from products p, locations l where p.code='123-250SW/A' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 48, 42.48, 212.81 from products p, locations l where p.code='123-860' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 6, 6.88, 198.84 from products p, locations l where p.code='129-575' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 2, 2.41, 276.76 from products p, locations l where p.code='129-605' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 1, 1.01, 192.08 from products p, locations l where p.code='131-100' and l.name='WISBECH'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 2, 2.62, 412.98 from products p, locations l where p.code='137-650' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 1, 34.43, 207.12 from products p, locations l where p.code='152-900' and l.name='WISBECH'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 37, 34.43, 207.12 from products p, locations l where p.code='152-900' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 1, 2.44, 188.11 from products p, locations l where p.code='163-240' and l.name='WISBECH'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 1, 2.43, 177.37 from products p, locations l where p.code='16X75X2400 P1 KD' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 1, 3.04, 202.63 from products p, locations l where p.code='16X75X3000 P1 KD' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 40, 38.88, 158.54 from products p, locations l where p.code='17-100' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 20, 19.44, 174.9 from products p, locations l where p.code='17-100/B' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 23, 22.8, 243.64 from products p, locations l where p.code='17-102' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 1, 1.04, 206.73 from products p, locations l where p.code='17-105' and l.name='WISBECH'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 20, 20.61, 170.5 from products p, locations l where p.code='17-106' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 10, 11.57, 169.66 from products p, locations l where p.code='17-120' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 1, 1.07, 185.05 from products p, locations l where p.code='17-120SW/A' and l.name='WISBECH'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 40, 81.65, 231.1 from products p, locations l where p.code='17-210' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 29, 23.82, 193.37 from products p, locations l where p.code='17-845' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 38, 33.07, 185.82 from products p, locations l where p.code='17-900' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 1, 0.98, 202.04 from products p, locations l where p.code='19-260SW/A' and l.name='WISBECH'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 4, 12.68, 203.94 from products p, locations l where p.code='19-305SW/A' and l.name='WISBECH'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 34, 27.93, 208.59 from products p, locations l where p.code='20-845' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 10, 40.66, 202.31 from products p, locations l where p.code='22X100X4200 P1 KD' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 17, 76.61, 216.42 from products p, locations l where p.code='22X100X4800 P1 KD' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 1, 5.11, 202.35 from products p, locations l where p.code='22X100X5400 P1 KD' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 12, 35.07, 174.79 from products p, locations l where p.code='22X75X3000 P1 KD' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 3, 11.72, 174.83 from products p, locations l where p.code='22X75X3600 P1 KD' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 3, 3.63, 213.77 from products p, locations l where p.code='402-120' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 1, 0.62, 198.39 from products p, locations l where p.code='450-103' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 11, 12.97, 158.37 from products p, locations l where p.code='450-120' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 6, 13.27, 197.74 from products p, locations l where p.code='450-135' and l.name='WISBECH'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 4, 13.27, 197.74 from products p, locations l where p.code='450-135' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 7, 9.43, 197.45 from products p, locations l where p.code='450-137' and l.name='WISBECH'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 15, 54.25, 183.91 from products p, locations l where p.code='450-240' and l.name='WISBECH'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 8, 54.25, 183.91 from products p, locations l where p.code='450-240' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 15, 35.64, 272.5 from products p, locations l where p.code='47-240SW/BR' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 26, 61.78, 229.75 from products p, locations l where p.code='47-240SW/G' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 7, 80.19, 236.55 from products p, locations l where p.code='47-300SW/BR' and l.name='WISBECH'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 20, 80.19, 236.55 from products p, locations l where p.code='47-300SW/BR' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 4, 11.88, 229.8 from products p, locations l where p.code='47-300SW/G' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 43, 96.52, 0 from products p, locations l where p.code='47X100X3000 KD/HT' and l.name='WISBECH'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 38, 38.05, 191.27 from products p, locations l where p.code='500-105' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 38, 39.94, 154.03 from products p, locations l where p.code='500-110' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 1, 1.02, 188.24 from products p, locations l where p.code='500-120' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 3, 3.05, 165.25 from products p, locations l where p.code='500-120SW/A' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 28, 33.44, 255.44 from products p, locations l where p.code='500-125' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 11, 15.77, 165 from products p, locations l where p.code='500-150SW/A' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 1, 38.98, 155.82 from products p, locations l where p.code='500-240/F3' and l.name='WISBECH'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 18, 42.22, 157.7 from products p, locations l where p.code='500-240/F3' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 24, 55.04, 165.03 from products p, locations l where p.code='500-240SW/A' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 9, 25.8, 248.72 from products p, locations l where p.code='500-300/F3' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 1, 2.87, 174.56 from products p, locations l where p.code='500-300/SL' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 1, 2.88, 0 from products p, locations l where p.code='500-300SW F2' and l.name='WISBECH'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 10, 28.67, 188.35 from products p, locations l where p.code='500-300SW/A' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 6, 8.03, 161.02 from products p, locations l where p.code='500-700' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 3, 2.15, 153.95 from products p, locations l where p.code='500-750SW/A' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 50, 42.72, 253.7 from products p, locations l where p.code='500-900/SL' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 84, 78.26, 196.43 from products p, locations l where p.code='500-975AL' and l.name='WISBECH'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 26, 29.48, 270.08 from products p, locations l where p.code='901-120W' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 88, 83.16, 147.16 from products p, locations l where p.code='9-100' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 14, 19.64, 186.05 from products p, locations l where p.code='9-100/B' and l.name='WISBECH'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 7, 18.9, 186.61 from products p, locations l where p.code='9-100/B' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 77, 77.13, 202.28 from products p, locations l where p.code='9-106' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 39, 44.23, 187.68 from products p, locations l where p.code='9-120' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 28, 31.75, 147.59 from products p, locations l where p.code='9-120/B' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 34, 38.48, 268.24 from products p, locations l where p.code='9-120SW/A' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 15, 19.28, 183.56 from products p, locations l where p.code='9-136' and l.name='WISBECH'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 12, 17.01, 235.68 from products p, locations l where p.code='9-150' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 25, 47.25, 167.79 from products p, locations l where p.code='9-200' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 76, 57.46, 265.7 from products p, locations l where p.code='9-800' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 11, 10.15, 407.29 from products p, locations l where p.code='AJO-610SW' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 7, 16.52, 206.78 from products p, locations l where p.code='AT-100SW/A' and l.name='WISBECH'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 10, 16.52, 206.78 from products p, locations l where p.code='AT-100SW/A' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 28, 32.66, 199.85 from products p, locations l where p.code='AT-120SW/A' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 1, 0, null from products p, locations l where p.code='ATS-100SW/A' and l.name='WISBECH'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 17, 20.72, 366.8 from products p, locations l where p.code='JE-1175SW' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 41, 38.56, 228.32 from products p, locations l where p.code='JET-100SW/A' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 4, 4.14, 206.28 from products p, locations l where p.code='JET-110SW/A' and l.name='WISBECH'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 95, 107, 233.14 from products p, locations l where p.code='JET-120SW/A' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 101, 114.11, 204.37 from products p, locations l where p.code='JMJ-120SW/A' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 4, 4.54, 196.7 from products p, locations l where p.code='JT-120SW/A' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 7, 14.11, 168.11 from products p, locations l where p.code='P1 F2-2400' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 8, 20.16, 159.13 from products p, locations l where p.code='P1 F2-3000' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 5, 15.12, 160.25 from products p, locations l where p.code='P1 F2-3600' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 1, 4.03, 181.89 from products p, locations l where p.code='P1 F2-4800' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 2, 5.04, 174.8 from products p, locations l where p.code='P1-F2-3000' and l.name='WISBECH'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 5, 15.12, 174.74 from products p, locations l where p.code='P1-F2-3600' and l.name='WISBECH'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 3, 7.92, 161.87 from products p, locations l where p.code='P2 F2-3000' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 2, 6.34, 161.67 from products p, locations l where p.code='P2 F2-3600' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 36, 39.4, 202.54 from products p, locations l where p.code='P2-1000 KD/HT' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 44, 55.33, 200.43 from products p, locations l where p.code='P2-1200 KD/HT' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 4, 3.48, 197.99 from products p, locations l where p.code='P2-800 KD/HT' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 20, 19.8, 336.67 from products p, locations l where p.code='SC204-100' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 4, 3.67, 199.73 from products p, locations l where p.code='SC500-960SW/F3' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 3, 2.46, 179.67 from products p, locations l where p.code='SC9-100/B' and l.name='WISBECH'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 2, 2.27, 180.62 from products p, locations l where p.code='SC9-120/B' and l.name='WISBECH'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 35, 84, 0 from products p, locations l where p.code='SLP2-240SW/B.' and l.name='WISBECH'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 79, 189.6, 0 from products p, locations l where p.code='SLP2-240SW/G.' and l.name='WISBECH'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 22, 48.91, 232.24 from products p, locations l where p.code='SLP3-240SW/B/F3' and l.name='WISBECH'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 5, 100.04, 282.75 from products p, locations l where p.code='SLP3-240SW/G/F3' and l.name='WISBECH'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 40, 100.04, 282.75 from products p, locations l where p.code='SLP3-240SW/G/F3' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 4, 8.49, 216.02 from products p, locations l where p.code='VU-19038-4200/SW/KD/P1' and l.name='SUTTON BRIDGE'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
insert into stock_levels (product_id, location_id, packs, volume_m3, avg_cost_per_m3)
  select p.id, l.id, 2298, 3601.87, 187.28 from products p, locations l where p.code='Total' and l.name='UNALLOCATED'
  on conflict (product_id, location_id) do update set packs=excluded.packs, volume_m3=excluded.volume_m3, avg_cost_per_m3=excluded.avg_cost_per_m3;
