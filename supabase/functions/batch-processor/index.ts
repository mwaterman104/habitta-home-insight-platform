import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface BatchJobPayload {
  operation_type: 'enrich' | 'predict';
  property_ids: string[];
  user_id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { operation_type, property_ids, user_id } = await req.json() as BatchJobPayload;

    console.log(`Starting batch ${operation_type} job for ${property_ids.length} properties`);

    // Create batch job record
    const { data: batchJob, error: createError } = await supabase
      .from('batch_jobs')
      .insert({
        user_id,
        operation_type,
        status: 'running',
        total_properties: property_ids.length,
        properties_list: property_ids,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create batch job: ${createError.message}`);
    }

    console.log(`Created batch job ${batchJob.id}`);

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Process each property
    for (let i = 0; i < property_ids.length; i++) {
      const propertyId = property_ids[i];
      
      try {
        // Update current property being processed
        await supabase
          .from('batch_jobs')
          .update({
            current_property_id: propertyId,
            processed_properties: i + 1,
            successful_properties: successCount,
            failed_properties: failedCount,
          })
          .eq('id', batchJob.id);

        // Call the appropriate function
        const functionName = operation_type === 'enrich' ? 'enrich-property' : 'predict-property';
        const response = await supabase.functions.invoke(functionName, {
          body: { address_id: propertyId }
        });

        if (response.error) {
          throw new Error(response.error.message);
        }

        successCount++;
        console.log(`Successfully processed property ${i + 1}/${property_ids.length}: ${propertyId}`);

        // Update property status
        const newStatus = operation_type === 'enrich' ? 'enriched' : 'predicted';
        await supabase
          .from('properties_sample')
          .update({ status: newStatus })
          .eq('address_id', propertyId);

      } catch (error) {
        failedCount++;
        const errorMsg = `Property ${propertyId}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`Failed to process property ${i + 1}/${property_ids.length}:`, error);
        
        // Continue with next property instead of stopping
        continue;
      }

      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Mark job as completed
    await supabase
      .from('batch_jobs')
      .update({
        status: 'completed',
        processed_properties: property_ids.length,
        successful_properties: successCount,
        failed_properties: failedCount,
        completed_at: new Date().toISOString(),
        error_message: errors.length > 0 ? errors.join('; ') : null,
        current_property_id: null,
      })
      .eq('id', batchJob.id);

    console.log(`Batch job completed: ${successCount} success, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        status: 'completed',
        batch_job_id: batchJob.id,
        results: {
          total: property_ids.length,
          successful: successCount,
          failed: failedCount,
          errors: errors.slice(0, 10), // Limit error details in response
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Batch processor error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Batch processing failed',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});