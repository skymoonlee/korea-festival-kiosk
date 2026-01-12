import { cookies } from 'next/headers';
import crypto from 'crypto';

const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change_this_secret_key';

export function createSession(): string {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHmac('sha256', SESSION_SECRET).update(token).digest('hex');
  return `${token}.${hash}`;
}

export function verifySession(sessionToken: string): boolean {
  const parts = sessionToken.split('.');
  if (parts.length !== 2) return false;

  const [token, hash] = parts;
  const expectedHash = crypto.createHmac('sha256', SESSION_SECRET).update(token).digest('hex');
  return hash === expectedHash;
}

export async function setSessionCookie(session: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, session, {
    httpOnly: true,
    secure: false, // HTTP 환경에서도 쿠키 전송 허용
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24시간
    path: '/'
  });
}

export async function getSessionCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSessionCookie();
  if (!session) return false;
  return verifySession(session);
}
