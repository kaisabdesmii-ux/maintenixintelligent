
create type public.app_role as enum ('admin','maintenance_manager','technician','operator','warehouse_manager','purchasing_manager','production_manager','viewer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  department text,
  specialty text,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select, insert, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.has_any_role(_user_id uuid, _roles app_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and (role = any(_roles) or role = 'admin'))
$$;

create policy "profiles readable" on public.profiles for select to authenticated using (true);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id or public.has_role(auth.uid(),'admin'));
create policy "read own or admin roles" on public.user_roles for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "admin add roles" on public.user_roles for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin remove roles" on public.user_roles for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email);
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'viewer');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- EQUIPMENT
create table public.equipment (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  manufacturer text, brand text, model text, serial_number text,
  year_manufactured int, commissioning_date date,
  location text, workshop text, department text,
  category text not null default 'Production equipment',
  specifications text,
  criticality text not null default 'medium',
  status text not null default 'operational',
  image_url text,
  responsible_operator text,
  operating_hours numeric not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.equipment to authenticated;
grant all on public.equipment to service_role;
alter table public.equipment enable row level security;
create policy "eq read" on public.equipment for select to authenticated using (true);
create policy "eq insert" on public.equipment for insert to authenticated with check (public.has_any_role(auth.uid(), array['maintenance_manager']::app_role[]));
create policy "eq update" on public.equipment for update to authenticated using (public.has_any_role(auth.uid(), array['maintenance_manager','technician']::app_role[]));
create policy "eq delete" on public.equipment for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- BREAKDOWNS
create sequence public.breakdown_seq start 1001;
create table public.breakdowns (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default 'BRK-' || nextval('public.breakdown_seq'),
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  description text not null,
  failure_category text not null default 'Mechanical',
  failure_mode text,
  severity text not null default 'medium',
  priority text not null default 'medium',
  suspected_cause text,
  production_impact text,
  downtime_hours numeric not null default 0,
  reporter_name text,
  reported_by uuid,
  assigned_technician text,
  resolution text,
  repair_cost numeric not null default 0,
  status text not null default 'reported',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.breakdowns to authenticated;
grant all on public.breakdowns to service_role;
alter table public.breakdowns enable row level security;
create policy "bd read" on public.breakdowns for select to authenticated using (true);
create policy "bd insert" on public.breakdowns for insert to authenticated with check (public.has_any_role(auth.uid(), array['maintenance_manager','technician','operator','production_manager']::app_role[]));
create policy "bd update" on public.breakdowns for update to authenticated using (public.has_any_role(auth.uid(), array['maintenance_manager','technician']::app_role[]));
create policy "bd delete" on public.breakdowns for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- WORK ORDERS
create sequence public.wo_seq start 2001;
create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default 'WO-' || nextval('public.wo_seq'),
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  breakdown_id uuid references public.breakdowns(id) on delete set null,
  plan_id uuid,
  type text not null default 'corrective',
  description text not null,
  priority text not null default 'medium',
  assigned_technician text,
  planned_date date,
  start_date timestamptz, end_date timestamptz,
  estimated_hours numeric not null default 0,
  actual_hours numeric not null default 0,
  labor_cost numeric not null default 0,
  parts_cost numeric not null default 0,
  total_cost numeric generated always as (labor_cost + parts_cost) stored,
  work_performed text,
  comments text,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.work_orders to authenticated;
grant all on public.work_orders to service_role;
alter table public.work_orders enable row level security;
create policy "wo read" on public.work_orders for select to authenticated using (true);
create policy "wo insert" on public.work_orders for insert to authenticated with check (public.has_any_role(auth.uid(), array['maintenance_manager','technician']::app_role[]));
create policy "wo update" on public.work_orders for update to authenticated using (public.has_any_role(auth.uid(), array['maintenance_manager','technician']::app_role[]));
create policy "wo delete" on public.work_orders for delete to authenticated using (public.has_any_role(auth.uid(), array['maintenance_manager']::app_role[]));

-- PREVENTIVE PLANS
create table public.preventive_plans (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  title text not null,
  frequency text not null default 'monthly',
  interval_days int not null default 30,
  checklist text,
  last_done date,
  next_due date not null default current_date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.preventive_plans to authenticated;
grant all on public.preventive_plans to service_role;
alter table public.preventive_plans enable row level security;
create policy "pp read" on public.preventive_plans for select to authenticated using (true);
create policy "pp write" on public.preventive_plans for all to authenticated using (public.has_any_role(auth.uid(), array['maintenance_manager']::app_role[])) with check (public.has_any_role(auth.uid(), array['maintenance_manager']::app_role[]));

-- SPARE PARTS
create table public.spare_parts (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  designation text not null,
  category text, manufacturer text, supplier text,
  description text,
  unit_price numeric not null default 0,
  quantity numeric not null default 0,
  min_stock numeric not null default 0,
  max_stock numeric not null default 0,
  location text,
  lead_time_days int not null default 7,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.spare_parts to authenticated;
grant all on public.spare_parts to service_role;
alter table public.spare_parts enable row level security;
create policy "sp read" on public.spare_parts for select to authenticated using (true);
create policy "sp write" on public.spare_parts for all to authenticated using (public.has_any_role(auth.uid(), array['warehouse_manager','purchasing_manager']::app_role[])) with check (public.has_any_role(auth.uid(), array['warehouse_manager','purchasing_manager']::app_role[]));

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references public.spare_parts(id) on delete cascade,
  movement_type text not null,
  quantity numeric not null,
  previous_balance numeric not null default 0,
  new_balance numeric not null default 0,
  work_order_id uuid references public.work_orders(id) on delete set null,
  note text,
  user_id uuid default auth.uid(),
  created_at timestamptz not null default now()
);
grant select, insert on public.stock_movements to authenticated;
grant all on public.stock_movements to service_role;
alter table public.stock_movements enable row level security;
create policy "sm read" on public.stock_movements for select to authenticated using (true);
create policy "sm insert" on public.stock_movements for insert to authenticated with check (public.has_any_role(auth.uid(), array['warehouse_manager','technician','maintenance_manager']::app_role[]));

create or replace function public.apply_stock_movement()
returns trigger language plpgsql security definer set search_path = public as $$
declare cur numeric; delta numeric;
begin
  if new.movement_type not in ('entry','exit','return','correction') then
    raise exception 'Invalid movement type';
  end if;
  select quantity into cur from public.spare_parts where id = new.part_id for update;
  delta := case new.movement_type when 'exit' then -abs(new.quantity) when 'correction' then new.quantity else abs(new.quantity) end;
  if cur + delta < 0 then raise exception 'Insufficient stock (available: %)', cur; end if;
  new.previous_balance := cur;
  new.new_balance := cur + delta;
  update public.spare_parts set quantity = cur + delta where id = new.part_id;
  return new;
end $$;
create trigger trg_stock_movement before insert on public.stock_movements for each row execute function public.apply_stock_movement();

-- SENSOR READINGS
create table public.sensor_readings (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  temperature numeric, vibration numeric, pressure numeric, current_a numeric,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.sensor_readings to authenticated;
grant all on public.sensor_readings to service_role;
alter table public.sensor_readings enable row level security;
create policy "sr read" on public.sensor_readings for select to authenticated using (true);
create policy "sr insert" on public.sensor_readings for insert to authenticated with check (public.has_any_role(auth.uid(), array['maintenance_manager','technician','operator']::app_role[]));

-- FMEA
create table public.fmea_items (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  function_name text not null,
  failure_mode text not null,
  effects text, causes text,
  severity int not null default 5 check (severity between 1 and 10),
  occurrence int not null default 5 check (occurrence between 1 and 10),
  detection int not null default 5 check (detection between 1 and 10),
  rpn int generated always as (severity*occurrence*detection) stored,
  action text, owner text, deadline date,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.fmea_items to authenticated;
grant all on public.fmea_items to service_role;
alter table public.fmea_items enable row level security;
create policy "fm read" on public.fmea_items for select to authenticated using (true);
create policy "fm write" on public.fmea_items for all to authenticated using (public.has_any_role(auth.uid(), array['maintenance_manager']::app_role[])) with check (public.has_any_role(auth.uid(), array['maintenance_manager']::app_role[]));

-- SEED
insert into public.equipment (code,name,manufacturer,brand,model,serial_number,year_manufactured,commissioning_date,location,workshop,department,category,criticality,status,responsible_operator,operating_hours,specifications) values
('EQ-PMP-001','Centrifugal Pump P1','Grundfos','Grundfos','CR 32-4','GF88213',2018,'2018-06-12','Zone A','Utilities','Production','Pumps','high','operational','A. Benali',18450,'32 m3/h, 7.5 kW'),
('EQ-MOT-002','Main Drive Motor M2','Siemens','Siemens','1LE1 132','SI55120',2017,'2017-03-01','Zone B','Line 1','Production','Electric motors','critical','under_maintenance','K. Haddad',22010,'55 kW, 1480 rpm'),
('EQ-CMP-003','Air Compressor C1','Atlas Copco','Atlas Copco','GA 37','AC77812',2019,'2019-09-20','Utility room','Utilities','Maintenance','Compressors','critical','failure','S. Amrani',15230,'37 kW, 8 bar'),
('EQ-HYD-004','Hydraulic Press H1','Bosch Rexroth','Rexroth','HPX-200','BR11098',2016,'2016-11-05','Zone C','Stamping','Production','Hydraulic systems','high','operational','M. Toumi',25600,'200 t, 250 bar'),
('EQ-CNC-005','CNC Machining Center','DMG Mori','DMG Mori','DMU 50','DM34411',2020,'2020-02-14','Zone D','Machining','Production','CNC machines','high','operational','Y. Saidi',9800,'5-axis, 18000 rpm'),
('EQ-CNV-006','Assembly Conveyor CV1','Interroll','Interroll','RM 8000','IR99001',2015,'2015-07-30','Zone E','Assembly','Production','Conveyors','medium','operational','N. Kaci',30500,'24 m, 0.5 m/s'),
('EQ-ROB-007','Welding Robot R1','ABB','ABB','IRB 2600','AB12345',2021,'2021-05-10','Zone F','Welding','Production','Industrial robots','critical','operational','R. Mansouri',7200,'6-axis, 20 kg payload'),
('EQ-PRD-008','Packaging Machine PK1','Krones','Krones','Variopac','KR56789',2019,'2019-01-18','Zone G','Packaging','Production','Production equipment','medium','operational','L. Ferhat',14100,'120 packs/min');

insert into public.breakdowns (equipment_id, occurred_at, description, failure_category, failure_mode, severity, priority, suspected_cause, downtime_hours, reporter_name, assigned_technician, repair_cost, status, resolution)
select e.id, now() - (d || ' days')::interval, v.descr, v.cat, v.mode, v.sev, v.sev, v.cause, v.dt, 'Operator', v.tech, v.cost, v.st, case when v.st in ('resolved','closed') then 'Component replaced and tested' end
from (values
 ('EQ-CMP-003',3,'Compressor overheating and shutdown','Mechanical','Overheating','critical','Clogged cooler',0,'S. Ouali',0,'in_progress'),
 ('EQ-CMP-003',40,'Pressure drop at outlet','Pneumatic','Leak','high','Worn seal',6,'S. Ouali',850,'closed'),
 ('EQ-CMP-003',95,'Abnormal vibration','Mechanical','Bearing wear','high','Lubrication failure',9,'H. Brahimi',1400,'closed'),
 ('EQ-CMP-003',150,'Motor trip','Electrical','Overload','medium','Phase imbalance',4,'H. Brahimi',300,'closed'),
 ('EQ-MOT-002',5,'Motor bearing noise','Mechanical','Bearing wear','high','Lack of grease',5,'H. Brahimi',600,'resolved'),
 ('EQ-MOT-002',70,'Insulation fault','Electrical','Short circuit','critical','Moisture',14,'F. Zerrouki',3200,'closed'),
 ('EQ-HYD-004',12,'Hydraulic oil leak','Hydraulic','Leak','medium','Hose crack',3,'F. Zerrouki',420,'closed'),
 ('EQ-HYD-004',120,'Pressure loss','Hydraulic','Pump wear','high','Worn pump',11,'S. Ouali',2600,'closed'),
 ('EQ-PMP-001',25,'Cavitation noise','Mechanical','Cavitation','medium','Low suction pressure',2,'S. Ouali',150,'closed'),
 ('EQ-CNV-006',8,'Belt misalignment','Mechanical','Misalignment','low','Tension loss',1.5,'F. Zerrouki',80,'closed'),
 ('EQ-CNV-006',60,'Roller seized','Mechanical','Seizure','medium','Contamination',2.5,'F. Zerrouki',210,'closed'),
 ('EQ-CNC-005',18,'Spindle encoder error','Electrical','Sensor fault','high','Cable damage',6,'H. Brahimi',950,'closed'),
 ('EQ-ROB-007',33,'Welding torch collision','Mechanical','Collision','medium','Program offset',2,'H. Brahimi',380,'closed'),
 ('EQ-PRD-008',2,'Film cutter jam','Mechanical','Jam','medium','Blade wear',0,'F. Zerrouki',0,'under_diagnosis'),
 ('EQ-PRD-008',80,'PLC communication loss','Electrical','Communication','high','Loose connector',4,'H. Brahimi',190,'closed')
) as v(code,d,descr,cat,mode,sev,cause,dt,tech,cost,st)
join public.equipment e on e.code = v.code;

insert into public.work_orders (equipment_id, type, description, priority, assigned_technician, planned_date, start_date, end_date, estimated_hours, actual_hours, labor_cost, parts_cost, status)
select e.id, v.t, v.descr, v.p, v.tech, current_date + v.pd, case when v.st in ('completed','validated','in_progress') then now() - (abs(v.pd)||' days')::interval end, case when v.st in ('completed','validated') then now() - (abs(v.pd)||' days')::interval + (v.ah||' hours')::interval end, v.eh, v.ah, v.lc, v.pc, v.st
from (values
 ('EQ-CMP-003','corrective','Replace compressor cooler','critical','S. Ouali',0,8,0,0,0,'in_progress'),
 ('EQ-MOT-002','corrective','Replace motor bearings','high','H. Brahimi',-4,5,5.5,330,270,'completed'),
 ('EQ-HYD-004','preventive','Hydraulic oil change','medium','F. Zerrouki',-10,4,3.5,210,380,'validated'),
 ('EQ-PMP-001','preventive','Pump seal inspection','low','S. Ouali',3,2,0,0,0,'scheduled'),
 ('EQ-CNC-005','preventive','Spindle lubrication & calibration','medium','H. Brahimi',5,3,0,0,0,'scheduled'),
 ('EQ-ROB-007','preventive','Robot axis backlash check','medium','H. Brahimi',-20,3,2.5,150,0,'validated'),
 ('EQ-PRD-008','corrective','Replace film cutter blade','medium','F. Zerrouki',0,2,0,0,0,'waiting_parts'),
 ('EQ-CNV-006','preventive','Belt tension adjustment','low','F. Zerrouki',-15,1,1,60,0,'completed'),
 ('EQ-CMP-003','corrective','Replace outlet seal','high','S. Ouali',-40,4,6,360,490,'validated'),
 ('EQ-MOT-002','preventive','Thermographic inspection','medium','H. Brahimi',7,2,0,0,0,'pending_approval')
) as v(code,t,descr,p,tech,pd,eh,ah,lc,pc,st)
join public.equipment e on e.code = v.code;

insert into public.preventive_plans (equipment_id, title, frequency, interval_days, checklist, last_done, next_due)
select e.id, v.title, v.f, v.i, v.c, current_date - v.ld, current_date - v.ld + v.i
from (values
 ('EQ-PMP-001','Seal & bearing inspection','monthly',30,'Check seal leaks; Measure vibration; Grease bearings',27),
 ('EQ-MOT-002','Thermography & insulation test','quarterly',90,'IR scan; Megger test; Clean fan',95),
 ('EQ-CMP-003','Filter & oil change','monthly',30,'Replace air filter; Change oil; Check drain',40),
 ('EQ-HYD-004','Hydraulic oil analysis','quarterly',90,'Sample oil; Inspect hoses',10),
 ('EQ-CNC-005','Spindle lubrication','weekly',7,'Lubricate; Check coolant level',5),
 ('EQ-ROB-007','Axis calibration','monthly',30,'Calibrate axes; Check cables',20),
 ('EQ-CNV-006','Belt and roller inspection','weekly',7,'Belt tension; Roller noise',9)
) as v(code,title,f,i,c,ld)
join public.equipment e on e.code = v.code;

insert into public.spare_parts (reference, designation, category, manufacturer, supplier, unit_price, quantity, min_stock, max_stock, location, lead_time_days) values
('SP-BRG-6205','Ball bearing 6205-2RS','Bearings','SKF','IndusSupply',18,24,10,60,'A-01-03',5),
('SP-BRG-6310','Ball bearing 6310','Bearings','SKF','IndusSupply',65,4,6,20,'A-01-04',7),
('SP-SEAL-32','Mechanical seal 32mm','Seals','Grundfos','PumpParts Co',140,3,2,8,'A-02-01',14),
('SP-FLT-GA37','Air filter GA37','Filters','Atlas Copco','AirTech',55,0,3,12,'B-01-02',10),
('SP-OIL-HLP46','Hydraulic oil HLP46 (20L)','Lubricants','Total','LubriMax',95,12,5,30,'C-03-01',4),
('SP-BLT-RM8','Conveyor belt RM8000','Belts','Interroll','IndusSupply',420,2,1,4,'D-01-01',21),
('SP-BLD-PK1','Film cutter blade','Blades','Krones','PackSpare',75,1,4,12,'B-02-05',12),
('SP-ENC-DMU','Spindle encoder','Electronics','Heidenhain','ElecPro',890,1,1,3,'E-01-01',30),
('SP-CNT-40A','Contactor 40A','Electrical','Schneider','ElecPro',48,15,5,25,'E-02-03',5),
('SP-GRS-LGMT','Bearing grease LGMT2 (1kg)','Lubricants','SKF','LubriMax',22,30,10,50,'C-03-04',3);

insert into public.sensor_readings (equipment_id, recorded_at, temperature, vibration, pressure, current_a)
select e.id, now() - (g || ' hours')::interval * 12,
  e_base.t + random()*5 + case when e.code='EQ-CMP-003' then (30-g)*0.9 else 0 end,
  e_base.v + random()*0.8 + case when e.code in ('EQ-CMP-003','EQ-MOT-002') then (30-g)*0.12 else 0 end,
  e_base.p + random()*0.5,
  e_base.c + random()*3
from public.equipment e
join (values ('EQ-PMP-001',45,2.0,4.0,14),('EQ-MOT-002',60,2.5,0,95),('EQ-CMP-003',70,2.2,8.0,65),('EQ-HYD-004',50,1.5,240,40),('EQ-CNC-005',38,1.0,6,30),('EQ-CNV-006',35,1.2,0,12),('EQ-ROB-007',40,0.8,0,22),('EQ-PRD-008',42,1.4,6,18)) as e_base(code,t,v,p,c) on e_base.code = e.code
cross join generate_series(0,30) g;

insert into public.fmea_items (equipment_id, function_name, failure_mode, effects, causes, severity, occurrence, detection, action, owner, deadline)
select e.id, v.f, v.m, v.ef, v.ca, v.s, v.o, v.d, v.a, v.ow, current_date + 30
from (values
 ('EQ-CMP-003','Compress air to 8 bar','Overheating','Line stop','Clogged cooler',9,7,4,'Monthly cooler cleaning','S. Ouali'),
 ('EQ-CMP-003','Compress air to 8 bar','Bearing failure','Unit damage','Poor lubrication',8,5,5,'Install vibration sensor','H. Brahimi'),
 ('EQ-MOT-002','Drive Line 1','Insulation breakdown','Line stop','Moisture ingress',10,3,6,'Quarterly insulation test','F. Zerrouki'),
 ('EQ-HYD-004','Apply 200t force','Oil leak','Quality defects, safety','Hose ageing',7,6,3,'Hose replacement plan','F. Zerrouki'),
 ('EQ-CNV-006','Transport parts','Belt misalignment','Slowdown','Tension loss',4,6,2,'Weekly tension check','F. Zerrouki')
) as v(code,f,m,ef,ca,s,o,d,a,ow)
join public.equipment e on e.code = v.code;
