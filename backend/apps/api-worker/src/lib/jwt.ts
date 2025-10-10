import { SignJWT } from 'jose';
import type { Env } from '../types/env';

export async function mintSupabaseJWT(
  env: Env,
  payload: {
    sub: string;
    org_id: string;
  }
): Promise<string> {
  const secret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);
  
  const jwt = await new SignJWT({
    sub: payload.sub,
    org_id: payload.org_id,
    role: 'authenticated',
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(secret);

  return jwt;
}

