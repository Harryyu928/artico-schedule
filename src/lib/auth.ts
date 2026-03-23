import { randomBytes, createHash } from 'crypto';
import { db } from '@/db';
import { users, sessions, teachers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7天

// 用户信息类型
export interface UserInfo {
  id: string;
  username: string;
  name: string;
  role: string;
  teacher?: any;
}

/**
 * 密码哈希
 */
export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

/**
 * 验证密码
 */
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

/**
 * 生成会话token
 */
export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * 创建会话
 */
export async function createSession(userId: string) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  await db.insert(sessions).values({
    id: randomBytes(16).toString('hex'),
    userId,
    token,
    expiresAt,
  });

  return { token, expiresAt };
}

/**
 * 验证会话
 */
export async function validateSession(token: string): Promise<{
  user: {
    id: string;
    username: string;
    name: string;
    role: string;
    teacher?: any;
  };
} | null> {
  const session: any = await db.query.sessions.findFirst({
    where: eq(sessions.token, token),
    with: {
      user: {
        with: {
          teacher: true,
        },
      },
    },
  });

  if (!session) return null;
  if (new Date() > session.expiresAt) {
    await db.delete(sessions).where(eq(sessions.id, session.id));
    return null;
  }

  return {
    user: {
      id: session.user.id,
      username: session.user.username,
      name: session.user.name,
      role: session.user.role,
      teacher: session.user.teacher || undefined,
    },
  };
}

/**
 * 删除会话
 */
export async function deleteSession(token: string) {
  await db.delete(sessions).where(eq(sessions.token, token));
}

/**
 * 获取当前用户
 */
export async function getCurrentUser(): Promise<UserInfo | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    if (!token) return null;

    const session = await validateSession(token);
    
    if (!session?.user) return null;
    
    return {
      id: session.user.id,
      username: session.user.username,
      name: session.user.name,
      role: session.user.role,
      teacher: session.user.teacher,
    };
  } catch (error) {
    console.error('获取当前用户失败:', error);
    return null;
  }
}

/**
 * 用户登录
 */
export async function loginUser(username: string, password: string) {
  const passwordHash = hashPassword(password);

  const user = await db.query.users.findFirst({
    where: eq(users.username, username),
    with: {
      teacher: true,
    },
  });

  if (!user || user.passwordHash !== passwordHash) {
    return { success: false, error: '用户名或密码错误' };
  }

  if (!user.isActive) {
    return { success: false, error: '账户已被禁用' };
  }

  // 更新最后登录时间
  await db.update(users)
    .set({ lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  // 创建会话
  const { token, expiresAt } = await createSession(user.id);

  return {
    success: true,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      teacher: user.teacher,
    },
    token,
    expiresAt,
  };
}

/**
 * 用户登出
 */
export async function logoutUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;

  if (token) {
    await deleteSession(token);
  }
}

/**
 * 初始化管理员账户
 */
export async function initAdminUser() {
  const adminExists = await db.query.users.findFirst({
    where: eq(users.role, '管理员'),
  });

  if (!adminExists) {
    await db.insert(users).values({
      id: randomBytes(16).toString('hex'),
      username: 'admin',
      passwordHash: hashPassword('admin123'),
      role: '管理员',
      name: '系统管理员',
      isActive: true,
    });
    console.log('管理员账户已创建: admin / admin123');
  }
}

/**
 * 为导师创建登录账户
 */
export async function createTeacherUser(teacherId: string, username: string, password: string, name: string) {
  const existingUser = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (existingUser) {
    return { success: false, error: '用户名已存在' };
  }

  const userId = randomBytes(16).toString('hex');
  
  await db.insert(users).values({
    id: userId,
    username,
    passwordHash: hashPassword(password),
    role: '导师',
    teacherId,
    name,
    isActive: true,
  });

  return { success: true, userId };
}
