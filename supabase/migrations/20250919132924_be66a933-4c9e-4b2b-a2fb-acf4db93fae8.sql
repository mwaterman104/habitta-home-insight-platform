-- Create a function to link homes to properties and promote validation data
CREATE OR REPLACE FUNCTION public.link_home_to_property(p_home_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
declare 
  home_record record;
  property_record record;
  result jsonb;
begin
  -- Get the home record
  SELECT * INTO home_record FROM public.homes WHERE id = p_home_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Home not found');
  END IF;
  
  -- Try to find matching property by address
  SELECT * INTO property_record FROM public.properties 
  WHERE LOWER(address) LIKE LOWER('%' || home_record.address || '%') 
     OR LOWER(address) LIKE LOWER('%' || home_record.city || '%')
  LIMIT 1;
  
  -- If no property found, create one
  IF NOT FOUND THEN
    INSERT INTO public.properties (address, zipcode, address_std)
    VALUES (
      home_record.address || ', ' || home_record.city || ', ' || home_record.state || ' ' || home_record.zip_code,
      home_record.zip_code,
      UPPER(home_record.address || ' ' || home_record.city || ' ' || home_record.state || ' ' || home_record.zip_code)
    )
    RETURNING * INTO property_record;
  END IF;
  
  -- Link the home to the property
  UPDATE public.homes 
  SET property_id = property_record.id
  WHERE id = p_home_id;
  
  -- Now promote validation data for this property
  SELECT public.promote_validation_to_production(property_record.id) INTO result;
  
  RETURN jsonb_build_object(
    'success', true,
    'property_id', property_record.id,
    'promotion_result', result
  );
  
exception when others then
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLSTATE,
    'message', SQLERRM
  );
end; 
$$;