-- 002_promote_validation_to_production.sql
-- Date: 2025-09-19
begin;

-- Create promote validation function
create or replace function public.promote_validation_to_production(p_property_id uuid)
returns jsonb 
language plpgsql 
security definer 
as $$
declare 
  promoted_systems int := 0; 
  promoted_props int := 0;
begin
  -- Update properties table if labels exist
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='labels') then
    -- Update year_built from labels if available
    update public.homes h
    set year_built = coalesce(h.year_built, (
      select (l.roof_estimated_remaining_years + extract(year from now()) - 25)::int 
      from public.labels l 
      where l.address_id::text = h.id::text 
      order by l.created_at desc 
      limit 1
    ))
    where h.id = p_property_id and h.year_built is null;
    get diagnostics promoted_props = row_count;
    
    -- Promote HVAC system from labels
    insert into public.systems (user_id, home_id, kind, install_year, confidence, status)
    select 
      h.user_id,
      h.id,
      'hvac',
      case 
        when l.hvac_estimated_remaining_years is not null then 
          extract(year from now())::int - (15 - l.hvac_estimated_remaining_years)
        else extract(year from now())::int - 10
      end,
      coalesce(l.labeler_confidence_0_1, 0.8),
      'ACTIVE'
    from public.labels l
    join public.homes h on h.id::text = l.address_id::text
    where h.id = p_property_id
      and l.hvac_present = true
      and not exists (
        select 1 from public.systems s 
        where s.home_id = h.id and s.kind = 'hvac'
      )
    limit 1;
    
    -- Promote roof system from labels  
    insert into public.systems (user_id, home_id, kind, install_year, confidence, status, material)
    select 
      h.user_id,
      h.id,
      'roof',
      case 
        when l.roof_estimated_remaining_years is not null then 
          extract(year from now())::int - (25 - l.roof_estimated_remaining_years)
        else extract(year from now())::int - 15
      end,
      coalesce(l.labeler_confidence_0_1, 0.8),
      'ACTIVE',
      l.roof_material
    from public.labels l
    join public.homes h on h.id::text = l.address_id::text
    where h.id = p_property_id
      and not exists (
        select 1 from public.systems s 
        where s.home_id = h.id and s.kind = 'roof'
      )
    limit 1;
    
    -- Promote water heater system from labels
    insert into public.systems (user_id, home_id, kind, install_year, confidence, status, material)
    select 
      h.user_id,
      h.id,
      'water_heater',
      extract(year from now())::int - 8, -- default 8 years old
      coalesce(l.labeler_confidence_0_1, 0.7),
      'ACTIVE',
      l.water_heater_type
    from public.labels l
    join public.homes h on h.id::text = l.address_id::text
    where h.id = p_property_id
      and l.water_heater_present = true
      and not exists (
        select 1 from public.systems s 
        where s.home_id = h.id and s.kind = 'water_heater'
      )
    limit 1;
    
    get diagnostics promoted_systems = row_count;
  end if;
  
  -- Also promote from predictions table if available  
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='predictions') then
    -- Promote predicted systems that don't exist yet
    insert into public.systems (user_id, home_id, kind, install_year, confidence, status)
    select 
      h.user_id,
      h.id,
      case p.field
        when 'hvac_age_bucket' then 'hvac'
        when 'roof_age_bucket' then 'roof' 
        when 'water_heater_age_bucket' then 'water_heater'
      end,
      extract(year from now())::int - 10, -- default age
      p.confidence_0_1,
      'PREDICTED'
    from public.predictions p
    join public.addresses a on a.id = p.address_id
    join public.homes h on h.id::text = a.id::text
    where h.id = p_property_id
      and p.field in ('hvac_age_bucket', 'roof_age_bucket', 'water_heater_age_bucket')
      and p.confidence_0_1 > 0.6
      and not exists (
        select 1 from public.systems s 
        where s.home_id = h.id 
        and s.kind = case p.field
          when 'hvac_age_bucket' then 'hvac'
          when 'roof_age_bucket' then 'roof'
          when 'water_heater_age_bucket' then 'water_heater'
        end
      )
    limit 3;
  end if;
  
  return jsonb_build_object(
    'promoted_properties', promoted_props,
    'promoted_systems', promoted_systems,
    'success', true
  );
  
exception when others then
  return jsonb_build_object(
    'error', SQLSTATE,
    'message', SQLERRM,
    'success', false
  );
end; 
$$;