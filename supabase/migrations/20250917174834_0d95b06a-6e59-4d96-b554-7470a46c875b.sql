-- Insert sample data for validation cockpit testing

INSERT INTO properties_sample (street_address, city, state, zip, status, assigned_to) VALUES
('123 Main Street', 'Orlando', 'FL', '32801', 'pending', 'John Doe'),
('456 Oak Avenue', 'Miami', 'FL', '33101', 'pending', 'Jane Smith'),
('789 Pine Road', 'Tampa', 'FL', '33602', 'enriched', 'Bob Johnson'),
('321 Cedar Lane', 'Jacksonville', 'FL', '32202', 'predicted', 'Alice Brown'),
('654 Maple Drive', 'Fort Lauderdale', 'FL', '33301', 'labeled', 'Mike Wilson');

-- Insert some mock enrichment snapshots for the enriched property
INSERT INTO enrichment_snapshots (address_id, provider, payload) 
SELECT address_id, 'smarty', 
  '{"delivery_line_1": "789 Pine Rd", "last_line": "Tampa FL 33602-1234", "delivery_point_barcode": "336021234567", "components": {"primary_number": "789", "street_name": "Pine", "street_suffix": "Rd", "city_name": "Tampa", "default_city_name": "Tampa", "state_abbreviation": "FL", "zipcode": "33602"}, "metadata": {"record_type": "S", "zip_type": "Standard", "county_fips": "12057", "county_name": "Hillsborough", "carrier_route": "C032", "congressional_district": "14", "precision": "Zip9"}, "analysis": {"dpv_match_y": "Y", "dpv_footnotes": "AABB", "cmra": "", "vacant": "", "active": "Y"}}'::jsonb
FROM properties_sample 
WHERE street_address = '789 Pine Road';

INSERT INTO enrichment_snapshots (address_id, provider, payload) 
SELECT address_id, 'attom', 
  '{"property": {"identifier": {"Id": 12345, "fips": "12057"}, "lot": {"lotSize1": 0.25}, "address": {"oneLine": "789 Pine Rd Tampa FL 33602", "line1": "789 Pine Rd", "line2": "Tampa, FL 33602", "locality": "Tampa", "countrySubd": "FL", "postal1": "33602"}, "summary": {"propclass": "Single Family Residential", "propsubtype": "Single Family Residence", "proptype": "SFR", "yearbuilt": 1995, "propLandUse": "Single Family Residential", "propIndicator": 10, "legal1": "LOT 15 BLK A PINE GARDENS"}, "building": {"size": {"bldgsize": 1850, "grosssize": 1850, "grosssizeadjusted": 1850, "livingsize": 1850, "groundfloorsize": 1850}, "rooms": {"bathstotal": 2.0, "bathsfull": 2, "beds": 3}}, "utilities": {"heatingtype": "Central", "cooling": "Central Air", "coolingtype": "Central Air"}}}'::jsonb
FROM properties_sample 
WHERE street_address = '789 Pine Road';

INSERT INTO enrichment_snapshots (address_id, provider, payload) 
SELECT address_id, 'shovels', 
  '{"permits": [{"id": "PERM001", "permit_number": "2019-ROOF-001", "issue_date": "2019-03-15", "description": "Residential roof replacement - shingle to shingle", "work_type": "Roofing", "contractor": "ABC Roofing LLC", "valuation": 15000, "status": "Finaled"}, {"id": "PERM002", "permit_number": "2021-HVAC-004", "issue_date": "2021-06-20", "description": "HVAC system replacement - central air conditioning unit", "work_type": "Mechanical", "contractor": "Cool Air Solutions", "valuation": 8500, "status": "Finaled"}]}'::jsonb
FROM properties_sample 
WHERE street_address = '789 Pine Road';

-- Insert sample predictions for the predicted property  
INSERT INTO predictions (address_id, prediction_run_id, field, predicted_value, confidence_0_1, data_provenance, model_version)
SELECT address_id, gen_random_uuid(), 'roof_age_bucket', '6-10y', 0.9, 
  '{"source": "shovels_permit", "permit_year": 2019}'::jsonb, 'rules_v0.1'
FROM properties_sample 
WHERE street_address = '321 Cedar Lane';

INSERT INTO predictions (address_id, prediction_run_id, field, predicted_value, confidence_0_1, data_provenance, model_version)
SELECT address_id, gen_random_uuid(), 'hvac_system_type', 'central_air', 0.8, 
  '{"source": "statistical_default", "climate": "florida"}'::jsonb, 'rules_v0.1'
FROM properties_sample 
WHERE street_address = '321 Cedar Lane';

INSERT INTO predictions (address_id, prediction_run_id, field, predicted_value, confidence_0_1, data_provenance, model_version)
SELECT address_id, gen_random_uuid(), 'hvac_age_bucket', '11-15y', 0.6, 
  '{"source": "estimated_from_home_age"}'::jsonb, 'rules_v0.1'
FROM properties_sample 
WHERE street_address = '321 Cedar Lane';

-- Insert sample labels for the labeled property
INSERT INTO labels (address_id, labeler, roof_material, roof_age_bucket, hvac_present, hvac_system_type, hvac_age_bucket, water_heater_type, water_heater_age_bucket, labeler_confidence_0_1, labeler_notes)
SELECT address_id, 'Expert Labeler', 'asphalt_shingle', '6-10y', true, 'central_air', '11-15y', 'gas_tank', '6-10y', 0.9, 'Property inspected on-site. Recent roof replacement visible, HVAC unit appears to be original to home construction.'
FROM properties_sample 
WHERE street_address = '654 Maple Drive';