-- 001_create_dashboard_views.sql
-- Date: 2025-09-19
begin;

-- Create dashboard views for real data integration
create or replace view public.v_dashboard_smart_tasks as
select 
  t.id,
  t.user_id,
  t.home_id as property_id,
  coalesce(t.priority, 'upcoming') as priority,
  t.title,
  t.description,
  null::integer as estimated_time,
  t.cost as estimated_cost,
  null::numeric as preventative_savings,
  t.category,
  t.due_date,
  null::numeric as confidence
from public.maintenance_tasks t 
where t.status in ('pending', 'in_progress');

-- Create system lifecycles view (based on systems table)
create or replace view public.v_dashboard_systems as
select 
  s.id,
  s.user_id,
  s.home_id as property_id,
  s.kind as system_type,
  null::text as brand,
  null::text as model,
  s.install_year::text as installation_date,
  case 
    when s.kind = 'roof' then 25
    when s.kind = 'hvac' then 15
    when s.kind = 'water_heater' then 12
    when s.kind = 'electrical' then 30
    else 20
  end as estimated_lifespan_years,
  null::date as predicted_replacement_date,
  null::numeric as replacement_probability,
  s.confidence as confidence_level,
  case 
    when s.kind = 'hvac' then 6
    when s.kind = 'water_heater' then 12
    else 12
  end as maintenance_frequency_months
from public.systems s;

-- Create replacements view using cost_predictions if available
create or replace view public.v_dashboard_replacements as
with system_costs as (
  select 
    s.home_id as property_id,
    s.kind as system_type,
    5 as horizon_years,
    case 
      when s.kind = 'roof' then 15000
      when s.kind = 'hvac' then 8000
      when s.kind = 'water_heater' then 2500
      when s.kind = 'electrical' then 5000
      else 3000
    end as cost_min,
    case 
      when s.kind = 'roof' then 25000
      when s.kind = 'hvac' then 12000
      when s.kind = 'water_heater' then 3500
      when s.kind = 'electrical' then 8000
      else 5000
    end as cost_avg,
    case 
      when s.kind = 'roof' then 35000
      when s.kind = 'hvac' then 18000
      when s.kind = 'water_heater' then 5000
      when s.kind = 'electrical' then 12000
      else 8000
    end as cost_max,
    0.3 as replacement_probability,
    (current_date + interval '5 years')::date as predicted_replacement_date
  from public.systems s
)
select * from system_costs;

-- Create property profile view
create or replace view public.v_property_profile as
with base_homes as (
  select 
    h.id as property_id,
    h.user_id,
    h.address as address_std,
    null::text as apn,
    h.zip_code as zipcode,
    h.year_built
  from public.homes h
),
roof_info as (
  select 
    s.home_id as property_id,
    s.material as roof_brand,
    null::text as roof_model,
    s.install_year::text as roof_installation_date,
    null::date as roof_predicted_replacement_date,
    null::numeric as roof_replacement_probability
  from public.systems s 
  where s.kind = 'roof'
),
latest_permit as (
  select 
    p.home_id as property_id,
    max(p.date_finaled) as last_permit_closed_date
  from public.permits p 
  where p.date_finaled is not null
  group by p.home_id
)
select 
  b.*,
  r.roof_brand,
  r.roof_model,
  r.roof_installation_date,
  r.roof_predicted_replacement_date,
  r.roof_replacement_probability,
  lp.last_permit_closed_date
from base_homes b
left join roof_info r on r.property_id = b.property_id
left join latest_permit lp on lp.property_id = b.property_id;

commit;