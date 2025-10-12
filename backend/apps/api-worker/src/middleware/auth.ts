import { createMiddleware } from 'hono/factory';
import { verifyToken } from '@clerk/backend';
import type { Env } from '../types/env';
import type { AuthContext } from '@ezsolvy/shared';
import { getSupabaseServiceClient } from '../lib/supabase';
import { mintSupabaseJWT } from '../lib/jwt';

export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: {
    auth: AuthContext;
  };
}>(async (c, next) => {
  if (c.env.DANGEROUS_DEV_BYPASS === '1') {
    const supabaseJwt = await mintSupabaseJWT(c.env, {
      sub: '00000000-0000-0000-0000-000000000001',
      org_id: '00000000-0000-0000-0000-000000000002',
    });
    c.set('auth', {
      clerkUserId: 'dev-clerk-user',
      userId: '00000000-0000-0000-0000-000000000001',
      orgId: '00000000-0000-0000-0000-000000000002',
      supabaseJwt,
    });
    return next();
  }
  // Extract Clerk session token from Authorization header
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.substring(7);

  try {
    // Verify Clerk token
    const clerkPayload = await verifyToken(token, {
      secretKey: c.env.CLERK_SECRET_KEY,
    });

    const clerkUserId = clerkPayload.sub;

    // Get or create user in Supabase
    const supabase = getSupabaseServiceClient(c.env);
    
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (userError || !user) {
      // Create user if doesn't exist
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          clerk_user_id: clerkUserId,
          email: (clerkPayload as any).email || '',
          name: (clerkPayload as any).name || null,
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Failed to create user:', createError);
        return c.json({ error: 'Failed to create user' }, 500);
      }

      user = newUser;

      // Create default organization for new user
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: 'Personal',
          owner_user_id: user.id,
        })
        .select('id')
        .single();

      if (!orgError && org) {
        await supabase.from('organization_members').insert({
          org_id: org.id,
          user_id: user.id,
          role: 'owner',
        });
      }
    }

    // Get org_id from header or use default
    let orgId = c.req.header('x-org-id') ?? undefined;

    if (!orgId) {
      // Get user's default organization (first membership)
      const { data: membership } = await supabase
        .from('organization_members')
        .select('org_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (membership?.org_id) {
        orgId = membership.org_id as string;
      } else {
        return c.json({ error: 'No organization found' }, 403);
      }
    }

    if (!orgId) {
      return c.json({ error: 'No organization found' }, 403);
    }

    // Verify user has access to the org
    const { data: membership, error: memberError } = await supabase
      .from('organization_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !membership) {
      return c.json({ error: 'Access denied to organization' }, 403);
    }

    // Mint short-lived Supabase JWT with org_id claim
    const supabaseJwt = await mintSupabaseJWT(c.env, {
      sub: user.id,
      org_id: orgId,
    });

    // Set auth context
    c.set('auth', {
      clerkUserId,
      userId: user.id,
      orgId,
      supabaseJwt,
    });

    await next();
  } catch (error) {
    console.error('Auth error:', error);
    return c.json({ error: 'Unauthorized' }, 401);
  }
});
