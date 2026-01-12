-- 카테고리
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 메뉴
CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    description TEXT,
    image_url TEXT,
    is_available INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 옵션 그룹 (예: 맵기 선택, 사이즈 선택)
CREATE TABLE IF NOT EXISTS option_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    menu_item_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    is_required INTEGER DEFAULT 0,
    max_select INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
);

-- 옵션 선택지 (예: 덜맵게 +0원, 보통 +0원, 매운맛 +500원)
CREATE TABLE IF NOT EXISTS option_choices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    option_group_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    price_modifier INTEGER DEFAULT 0,
    is_default INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (option_group_id) REFERENCES option_groups(id) ON DELETE CASCADE
);

-- 세트 메뉴
CREATE TABLE IF NOT EXISTS set_menus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    description TEXT,
    is_available INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 세트 메뉴 구성품
CREATE TABLE IF NOT EXISTS set_menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    set_menu_id INTEGER NOT NULL,
    menu_item_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    FOREIGN KEY (set_menu_id) REFERENCES set_menus(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
);

-- 주문
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    total_price INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
);

-- 주문 상세
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    menu_item_id INTEGER,
    set_menu_id INTEGER,
    name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price INTEGER NOT NULL,
    options_json TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id),
    FOREIGN KEY (set_menu_id) REFERENCES set_menus(id)
);

-- 관리자 및 클라이언트 계정
CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    can_access_cooking INTEGER DEFAULT 1,
    can_access_order INTEGER DEFAULT 1,
    is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 주문번호 시퀀스 (일별 리셋용)
CREATE TABLE IF NOT EXISTS order_sequence (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    current_number INTEGER DEFAULT 0,
    last_reset_date TEXT
);

-- 초기 시퀀스 설정
INSERT OR IGNORE INTO order_sequence (id, current_number, last_reset_date) VALUES (1, 0, date('now'));

-- 기본 관리자 계정 (비밀번호: bs22admin)
INSERT OR IGNORE INTO admin_users (username, password_hash)
VALUES ('admin', '$2b$10$placeholder_hash_will_be_replaced');
