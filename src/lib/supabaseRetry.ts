import { supabase } from "@/integrations/supabase/client";

/**
 * Invoke a Supabase edge function with automatic retry on auth errors.
 * Handles the transient 401/500 that occurs when the session token
 * expires and the client is mid-refresh.
 */
export async function invokeWithRetry<T = any>(
  functionName: string,
  options: { body?: any } = {},
  retries = 1
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(functionName, options);

  if (error && retries > 0) {
    const msg = error?.message || '';
    const isAuthError =
      msg.includes('non-2xx') ||
      msg.includes('Unauthorized') ||
      msg.includes('Invalid token');

    if (isAuthError) {
      // Wait briefly for the auto-refresh to complete
      await new Promise((r) => setTimeout(r, 1500));
      return invokeWithRetry<T>(functionName, options, retries - 1);
    }
  }

  if (error) throw error;
  return data as T;
}
