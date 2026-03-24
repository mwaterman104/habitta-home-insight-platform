/**
 * Internal authentication helper for edge function chaining
 * 
 * Provides hybrid auth validation:
 * - Internal calls: x-internal-secret header
 * - User calls: JWT in Authorization header with ownership validation
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AuthResult {
  authorized: boolean;
  isInternal: boolean;
  userId?: string;
  error?: string;
}

/**
 * Validate internal secret header
 */
export function validateInternalSecret(req: Request): boolean {
  const internalSecret = req.headers.get('x-internal-secret');
  const expectedSecret = Deno.env.get('INTERNAL_ENRICH_SECRET');
  
  if (!expectedSecret) {
    console.error('[internalAuth] INTERNAL_ENRICH_SECRET not configured');
    return false;
  }
  
  return internalSecret === expectedSecret;
}

/**
 * Validate request with hybrid auth (internal secret OR user JWT)
 * 
 * For internal calls: validates x-internal-secret header
 * For user calls: validates JWT and returns userId
 */
export async function validateRequest(req: Request): Promise<AuthResult> {
  // Check for internal secret first
  if (validateInternalSecret(req)) {
    return { authorized: true, isInternal: true };
  }
  
  // Check for user JWT
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { authorized: false, isInternal: false, error: 'Missing authorization' };
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return { authorized: false, isInternal: false, error: 'Invalid token' };
    }
    
    return { authorized: true, isInternal: false, userId: user.id };
  } catch (err) {
    return { authorized: false, isInternal: false, error: 'Auth validation failed' };
  }
}

/**
 * Validate that a home belongs to a user (for non-internal calls)
 */
export async function validateHomeOwnership(
  homeId: string,
  userId: string
): Promise<boolean> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: home, error } = await supabase
      .from('homes')
      .select('id')
      .eq('id', homeId)
      .eq('user_id', userId)
      .single();
    
    return !error && !!home;
  } catch {
    return false;
  }
}

/**
 * Get internal secret header for chaining calls
 */
export function getInternalSecretHeader(): Record<string, string> {
  const secret = Deno.env.get('INTERNAL_ENRICH_SECRET');
  if (!secret) {
    console.error('[internalAuth] INTERNAL_ENRICH_SECRET not configured for chaining');
    return {};
  }
  return { 'x-internal-secret': secret };
}
