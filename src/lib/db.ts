import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const DB_PATH = path.join(process.cwd(), 'database', 'kiosk.db');

// 데이터베이스 디렉토리 확인
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 싱글톤 패턴으로 DB 인스턴스 관리
let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeDb();
  }
  return db;
}

// 간단한 해시 함수 (bcrypt 대신 crypto 사용)
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

function initializeDb() {
  const database = db!;

  // 스키마 실행
  const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    // 각 문장을 개별 실행
    const statements = schema.split(';').filter(s => s.trim());
    for (const statement of statements) {
      try {
        database.exec(statement);
      } catch {
        // 이미 존재하는 테이블 등의 에러는 무시
      }
    }
  }

  // 마이그레이션: 권한 컬럼 추가 (기존 DB 호환)
  try {
    database.exec('ALTER TABLE admin_users ADD COLUMN can_access_cooking INTEGER DEFAULT 1');
  } catch { /* 이미 존재하면 무시 */ }
  try {
    database.exec('ALTER TABLE admin_users ADD COLUMN can_access_order INTEGER DEFAULT 1');
  } catch { /* 이미 존재하면 무시 */ }
  try {
    database.exec('ALTER TABLE admin_users ADD COLUMN is_admin INTEGER DEFAULT 0');
  } catch { /* 이미 존재하면 무시 */ }

  // 관리자 계정 설정
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminHash = hashPassword(adminPassword);
  const stmt = database.prepare(`
    UPDATE admin_users SET password_hash = ?, is_admin = 1 WHERE username = 'admin'
  `);
  const result = stmt.run(adminHash);

  if (result.changes === 0) {
    const insertStmt = database.prepare(`
      INSERT OR REPLACE INTO admin_users (username, password_hash, is_admin) VALUES ('admin', ?, 1)
    `);
    insertStmt.run(adminHash);
  }

  // 일반 사용자 계정 설정
  const userPassword = process.env.DEFAULT_USER_PASSWORD || 'user123';
  const userHash = hashPassword(userPassword);
  const userStmt = database.prepare(`
    UPDATE admin_users SET password_hash = ? WHERE username = '22user'
  `);
  const userResult = userStmt.run(userHash);

  if (userResult.changes === 0) {
    const insertUserStmt = database.prepare(`
      INSERT OR REPLACE INTO admin_users (username, password_hash) VALUES ('22user', ?)
    `);
    insertUserStmt.run(userHash);
  }
}

// 카테고리 관련 함수
export function getCategories() {
  return getDb().prepare('SELECT * FROM categories ORDER BY sort_order, id').all();
}

export function createCategory(name: string, sortOrder: number = 0) {
  const stmt = getDb().prepare('INSERT INTO categories (name, sort_order) VALUES (?, ?)');
  return stmt.run(name, sortOrder);
}

export function updateCategory(id: number, name: string, sortOrder: number) {
  const stmt = getDb().prepare('UPDATE categories SET name = ?, sort_order = ? WHERE id = ?');
  return stmt.run(name, sortOrder, id);
}

export function deleteCategory(id: number) {
  const stmt = getDb().prepare('DELETE FROM categories WHERE id = ?');
  return stmt.run(id);
}

export function getCategoryMenuCount(categoryId: number): number {
  const result = getDb().prepare('SELECT COUNT(*) as count FROM menu_items WHERE category_id = ?').get(categoryId) as { count: number };
  return result.count;
}

// 메뉴 관련 함수
export function getMenuItems(categoryId?: number) {
  if (categoryId) {
    return getDb().prepare('SELECT * FROM menu_items WHERE category_id = ? ORDER BY id').all(categoryId);
  }
  return getDb().prepare('SELECT * FROM menu_items ORDER BY category_id, id').all();
}

export function getMenuItem(id: number) {
  return getDb().prepare('SELECT * FROM menu_items WHERE id = ?').get(id);
}

export function createMenuItem(data: {
  category_id: number;
  name: string;
  price: number;
  description?: string;
  image_url?: string;
}) {
  const stmt = getDb().prepare(`
    INSERT INTO menu_items (category_id, name, price, description, image_url)
    VALUES (?, ?, ?, ?, ?)
  `);
  return stmt.run(data.category_id, data.name, data.price, data.description || null, data.image_url || null);
}

export function updateMenuItem(id: number, data: {
  category_id?: number;
  name?: string;
  price?: number;
  description?: string;
  image_url?: string;
  is_available?: boolean;
}) {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (data.category_id !== undefined) { fields.push('category_id = ?'); values.push(data.category_id); }
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.price !== undefined) { fields.push('price = ?'); values.push(data.price); }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
  if (data.image_url !== undefined) { fields.push('image_url = ?'); values.push(data.image_url); }
  if (data.is_available !== undefined) { fields.push('is_available = ?'); values.push(data.is_available ? 1 : 0); }

  values.push(id);
  const stmt = getDb().prepare(`UPDATE menu_items SET ${fields.join(', ')} WHERE id = ?`);
  return stmt.run(...values);
}

export function deleteMenuItem(id: number) {
  const stmt = getDb().prepare('DELETE FROM menu_items WHERE id = ?');
  return stmt.run(id);
}

export function safeDeleteMenuItem(id: number) {
  const database = getDb();

  // 1. order_items에서 menu_item_id를 NULL로 설정 (주문 기록 보존)
  database.prepare('UPDATE order_items SET menu_item_id = NULL WHERE menu_item_id = ?').run(id);

  // 2. set_menu_items에서 해당 레코드 삭제
  database.prepare('DELETE FROM set_menu_items WHERE menu_item_id = ?').run(id);

  // 3. menu_items에서 삭제 (option_groups, option_choices는 CASCADE로 자동 삭제)
  const stmt = database.prepare('DELETE FROM menu_items WHERE id = ?');
  return stmt.run(id);
}

// 옵션 그룹 관련 함수
export function getOptionGroups(menuItemId: number) {
  return getDb().prepare('SELECT * FROM option_groups WHERE menu_item_id = ? ORDER BY id').all(menuItemId);
}

export function createOptionGroup(data: {
  menu_item_id: number;
  name: string;
  is_required?: boolean;
  max_select?: number;
}) {
  const stmt = getDb().prepare(`
    INSERT INTO option_groups (menu_item_id, name, is_required, max_select)
    VALUES (?, ?, ?, ?)
  `);
  return stmt.run(data.menu_item_id, data.name, data.is_required ? 1 : 0, data.max_select || 1);
}

export function deleteOptionGroup(id: number) {
  const stmt = getDb().prepare('DELETE FROM option_groups WHERE id = ?');
  return stmt.run(id);
}

// 옵션 선택지 관련 함수
export function getOptionChoices(optionGroupId: number) {
  return getDb().prepare('SELECT * FROM option_choices WHERE option_group_id = ? ORDER BY id').all(optionGroupId);
}

export function createOptionChoice(data: {
  option_group_id: number;
  name: string;
  price_modifier?: number;
  is_default?: boolean;
}) {
  const stmt = getDb().prepare(`
    INSERT INTO option_choices (option_group_id, name, price_modifier, is_default)
    VALUES (?, ?, ?, ?)
  `);
  return stmt.run(data.option_group_id, data.name, data.price_modifier || 0, data.is_default ? 1 : 0);
}

export function deleteOptionChoice(id: number) {
  const stmt = getDb().prepare('DELETE FROM option_choices WHERE id = ?');
  return stmt.run(id);
}

// 주문 관련 함수
export function getNextOrderNumber(): number {
  const database = getDb();
  const today = new Date().toISOString().split('T')[0];

  const seq = database.prepare('SELECT * FROM order_sequence WHERE id = 1').get() as { current_number: number; last_reset_date: string } | undefined;

  if (!seq || seq.last_reset_date !== today) {
    database.prepare('UPDATE order_sequence SET current_number = 1, last_reset_date = ? WHERE id = 1').run(today);
    return 1;
  }

  const nextNumber = seq.current_number + 1;
  database.prepare('UPDATE order_sequence SET current_number = ? WHERE id = 1').run(nextNumber);
  return nextNumber;
}

export function createOrder(totalPrice: number, items: {
  menu_item_id?: number;
  set_menu_id?: number;
  name: string;
  quantity: number;
  unit_price: number;
  options_json?: string;
}[]) {
  const database = getDb();
  const orderNumber = getNextOrderNumber();

  const orderStmt = database.prepare(`
    INSERT INTO orders (order_number, total_price) VALUES (?, ?)
  `);
  const orderResult = orderStmt.run(orderNumber, totalPrice);
  const orderId = orderResult.lastInsertRowid;

  const itemStmt = database.prepare(`
    INSERT INTO order_items (order_id, menu_item_id, set_menu_id, name, quantity, unit_price, options_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const item of items) {
    itemStmt.run(
      orderId,
      item.menu_item_id || null,
      item.set_menu_id || null,
      item.name,
      item.quantity,
      item.unit_price,
      item.options_json || null
    );
  }

  return { orderId, orderNumber };
}

export function getOrders(status?: string) {
  if (status) {
    return getDb().prepare('SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC').all(status);
  }
  return getDb().prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
}

export function getOrder(id: number) {
  const order = getDb().prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (order) {
    const items = getDb().prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
    return { ...order, items };
  }
  return null;
}

export function updateOrderStatus(id: number, status: string) {
  const completedAt = status === 'completed' ? new Date().toISOString() : null;
  const stmt = getDb().prepare('UPDATE orders SET status = ?, completed_at = ? WHERE id = ?');
  return stmt.run(status, completedAt, id);
}

export function getActiveOrders() {
  const orders = getDb().prepare(`
    SELECT * FROM orders WHERE status IN ('pending', 'cooking') ORDER BY created_at ASC
  `).all() as { id: number }[];

  return orders.map(order => {
    const items = getDb().prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    return { ...order, items };
  });
}

// 통계 관련 함수
export function getTodayStats() {
  const today = new Date().toISOString().split('T')[0];

  const totalOrders = getDb().prepare(`
    SELECT COUNT(*) as count, SUM(total_price) as total FROM orders
    WHERE date(created_at) = ? AND status != 'cancelled'
  `).get(today) as { count: number; total: number };

  const completedOrders = getDb().prepare(`
    SELECT COUNT(*) as count FROM orders
    WHERE date(created_at) = ? AND status = 'completed'
  `).get(today) as { count: number };

  return {
    totalOrders: totalOrders?.count || 0,
    totalRevenue: totalOrders?.total || 0,
    completedOrders: completedOrders?.count || 0
  };
}

export function getMenuStats() {
  const today = new Date().toISOString().split('T')[0];

  return getDb().prepare(`
    SELECT oi.name, SUM(oi.quantity) as total_quantity, SUM(oi.unit_price * oi.quantity) as total_revenue
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE date(o.created_at) = ? AND o.status != 'cancelled'
    GROUP BY oi.name
    ORDER BY total_quantity DESC
  `).all(today);
}

// 관리자 인증
export function verifyAdmin(username: string, password: string): boolean {
  const user = getDb().prepare('SELECT * FROM admin_users WHERE username = ?').get(username) as { password_hash: string } | undefined;
  if (!user) return false;
  return verifyPassword(password, user.password_hash);
}

// 사용자 인증 (JWT용)
export function verifyUser(username: string, password: string): { id: number; username: string } | null {
  const user = getDb().prepare('SELECT id, username, password_hash FROM admin_users WHERE username = ?').get(username) as { id: number; username: string; password_hash: string } | undefined;
  if (!user) return null;
  if (!verifyPassword(password, user.password_hash)) return null;
  return { id: user.id, username: user.username };
}

// 전체 주문 데이터 삭제
export function clearAllOrders() {
  const database = getDb();
  const today = new Date().toISOString().split('T')[0];

  // order_items는 CASCADE로 자동 삭제됨
  database.prepare('DELETE FROM orders').run();

  // 주문 번호 시퀀스 리셋
  database.prepare('UPDATE order_sequence SET current_number = 0, last_reset_date = ? WHERE id = 1').run(today);

  return { success: true };
}

// 클라이언트 계정 관리 함수들

// 사용자 권한 조회
export function getUserPermissions(userId: number) {
  const user = getDb().prepare(`
    SELECT can_access_cooking, can_access_order, is_admin
    FROM admin_users WHERE id = ?
  `).get(userId) as { can_access_cooking: number; can_access_order: number; is_admin: number } | undefined;

  return user || { can_access_cooking: 0, can_access_order: 0, is_admin: 0 };
}

// 클라이언트 계정 목록 조회 (admin 제외)
export function getClientUsers() {
  return getDb().prepare(`
    SELECT id, username, can_access_cooking, can_access_order, created_at
    FROM admin_users WHERE is_admin = 0 ORDER BY created_at DESC
  `).all();
}

// 클라이언트 계정 생성
export function createClientUser(username: string, password: string, canCooking: boolean, canOrder: boolean) {
  const hash = hashPassword(password);
  const stmt = getDb().prepare(`
    INSERT INTO admin_users (username, password_hash, can_access_cooking, can_access_order, is_admin)
    VALUES (?, ?, ?, ?, 0)
  `);
  return stmt.run(username, hash, canCooking ? 1 : 0, canOrder ? 1 : 0);
}

// 클라이언트 계정 권한 수정
export function updateClientPermissions(id: number, canCooking: boolean, canOrder: boolean) {
  // admin 계정 보호
  const user = getDb().prepare('SELECT is_admin FROM admin_users WHERE id = ?').get(id) as { is_admin: number } | undefined;
  if (user?.is_admin === 1) {
    throw new Error('관리자 계정은 수정할 수 없습니다.');
  }

  const stmt = getDb().prepare(`
    UPDATE admin_users SET can_access_cooking = ?, can_access_order = ? WHERE id = ? AND is_admin = 0
  `);
  return stmt.run(canCooking ? 1 : 0, canOrder ? 1 : 0, id);
}

// 클라이언트 계정 삭제
export function deleteClientUser(id: number) {
  // admin 계정 보호
  const user = getDb().prepare('SELECT is_admin FROM admin_users WHERE id = ?').get(id) as { is_admin: number } | undefined;
  if (user?.is_admin === 1) {
    throw new Error('관리자 계정은 삭제할 수 없습니다.');
  }

  const stmt = getDb().prepare('DELETE FROM admin_users WHERE id = ? AND is_admin = 0');
  return stmt.run(id);
}
