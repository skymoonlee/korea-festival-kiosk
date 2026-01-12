import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_jwt_secret';
const JWT_COOKIE_NAME = 'user_token';
const JWT_EXPIRY = '7d'; // 7일

interface JwtPayload {
  userId: number;
  username: string;
}

export function generateToken(userId: number, username: string): string {
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

export async function setJwtCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(JWT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: false, // HTTP 환경에서도 쿠키 전송 허용
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7일
    path: '/'
  });
}

export async function getJwtCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(JWT_COOKIE_NAME)?.value || null;
}

export async function clearJwtCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(JWT_COOKIE_NAME);
}

export async function isUserAuthenticated(): Promise<boolean> {
  const token = await getJwtCookie();
  if (!token) return false;
  return verifyToken(token) !== null;
}

export async function getCurrentUser(): Promise<JwtPayload | null> {
  const token = await getJwtCookie();
  if (!token) return null;
  return verifyToken(token);
}

// ========== 어드민용 JWT 함수 ==========

const ADMIN_JWT_COOKIE_NAME = 'admin_token';
const ADMIN_JWT_EXPIRY = '24h'; // 24시간

interface AdminJwtPayload {
  userId: number;
  username: string;
  role: 'admin';
}

export function generateAdminToken(userId: number, username: string): string {
  return jwt.sign({ userId, username, role: 'admin' }, JWT_SECRET, { expiresIn: ADMIN_JWT_EXPIRY });
}

export function verifyAdminToken(token: string): AdminJwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AdminJwtPayload;
    if (decoded.role !== 'admin') return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function setAdminJwtCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_JWT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24시간
    path: '/'
  });
}

export async function getAdminJwtCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_JWT_COOKIE_NAME)?.value || null;
}

export async function clearAdminJwtCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_JWT_COOKIE_NAME);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const token = await getAdminJwtCookie();
  if (!token) return false;
  return verifyAdminToken(token) !== null;
}

export async function getCurrentAdmin(): Promise<AdminJwtPayload | null> {
  const token = await getAdminJwtCookie();
  if (!token) return null;
  return verifyAdminToken(token);
}
