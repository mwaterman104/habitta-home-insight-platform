import { supabase } from "@/integrations/supabase/client";

export function subscribePipelineProgress(propertyId: string, onMessage: (msg: any) => void) {
  const channel = supabase.channel(`pipeline:${propertyId}`);
  
  channel.on("broadcast", { event: "progress" }, (payload) => {
    console.log('Pipeline progress:', payload);
    onMessage(payload);
  });
  
  channel.subscribe((status) => {
    console.log('Channel subscription status:', status);
  });
  
  return () => {
    console.log('Unsubscribing from pipeline progress');
    supabase.removeChannel(channel);
  };
}