# Korea Festival Kiosk

학교 축제, 플리마켓, 푸드코트 등에서 사용할 수 있는 **실시간 음식 주문 관리 시스템**입니다.

SSE(Server-Sent Events) 기반으로 주문 접수부터 조리 완료까지 모든 과정이 **실시간으로 동기화**됩니다.

## 주요 기능

- 실시간 주문 동기화 (0.5초 간격 SSE)
- 일일 주문번호 자동 리셋 (매일 1번부터 시작)
- 메뉴/카테고리 관리
- 직원 계정 및 권한 관리
- 일일 매출 및 메뉴별 판매 통계
- 반응형 디자인 (PC, 태블릿, 모바일 지원)

## 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Backend | Next.js API Routes |
| Database | SQLite (better-sqlite3) |
| Real-time | Server-Sent Events (SSE) |

---

## 축제 현장 운영 가이드

### 시스템 구성도

```
[고객 디스플레이]     [카운터 (직원)]     [주방 디스플레이]
   (태블릿)              (PC/태블릿)          (모니터/태블릿)
      |                     |                     |
      +---------------------+---------------------+
                            |
                      [서버 (노트북)]
                            |
                      [관리자 페이지]
                       (매출/권한관리)
```

### 페이지별 역할

| 페이지 | URL | 용도 | 권장 기기 |
|--------|-----|------|-----------|
| **고객 디스플레이** | `/stream-customer` | 고객에게 주문 내역과 결제 금액 표시 | 태블릿 (고객 방향) |
| **카운터 (주문)** | `/order` | 직원이 고객 주문을 입력 | PC 또는 태블릿 |
| **주방 디스플레이** | `/cooking` | 주방에서 주문 확인 및 완료 처리 | 모니터 또는 태블릿 |
| **관리자** | `/admin-check` | 매출 현황 및 통계 확인 | PC |
| **직원 관리** | `/admin-maker` | 직원 계정 생성 및 권한 설정 | PC |
| **메뉴 관리** | `/admin-food` | 메뉴 및 카테고리 등록/수정 | PC |

### 현장 운영 시나리오

#### 1. 주문 접수 (카운터)
```
고객 방문 → 직원이 /order 페이지에서 메뉴 선택 → 주문 확정
```
- 직원이 메뉴를 터치하면 고객 디스플레이에 **실시간으로 표시**
- 고객이 화면을 보며 주문 내역 확인 가능
- 결제 완료 후 "주문하기" 버튼 클릭

#### 2. 고객 확인 (고객 디스플레이)
```
/stream-customer 페이지를 태블릿에 띄워 고객 방향으로 배치
```
- 현재 선택 중인 메뉴 목록 표시
- 총 결제 금액 실시간 업데이트
- 주문 완료 시 주문번호 표시

#### 3. 조리 (주방)
```
주문 접수 → /cooking 페이지에 실시간 표시 → 조리 완료 처리
```
- 새 주문이 들어오면 자동으로 목록에 추가
- 주문번호, 메뉴, 수량 한눈에 확인
- "완료" 버튼으로 조리 완료 처리

#### 4. 매출 관리 (관리자)
```
/admin-check 페이지에서 실시간 매출 확인
```
- 오늘의 총 주문 수
- 오늘의 총 매출액
- 메뉴별 판매 순위

---

## 설치 및 실행

### 1. 프로젝트 다운로드

```bash
git clone https://github.com/skymoonlee/korea-festival-kiosk.git
cd korea-festival-kiosk
```

### 2. 패키지 설치

```bash
npm install
```

### 3. 환경변수 설정

```bash
cp .env.example .env
```

`.env` 파일을 열어 값을 설정합니다:

```env
# 보안 키 (반드시 변경하세요)
JWT_SECRET=my_festival_jwt_secret_2024
SESSION_SECRET=my_festival_session_secret_2024

# 관리자 계정 비밀번호
ADMIN_PASSWORD=admin1234

# 일반 직원 계정 비밀번호
DEFAULT_USER_PASSWORD=staff1234
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 접속

### 5. 프로덕션 빌드 및 실행

```bash
npm run build
npm start
```

---

## 기본 계정

최초 실행 시 자동 생성되는 계정:

| 구분 | 아이디 | 비밀번호 | 권한 |
|------|--------|----------|------|
| 관리자 | `admin` | `.env`의 `ADMIN_PASSWORD` | 전체 |
| 직원 | `22user` | `.env`의 `DEFAULT_USER_PASSWORD` | 주문/주방 |

> 관리자 페이지(`/admin-maker`)에서 추가 직원 계정을 생성할 수 있습니다.

---

## 권한 시스템

| 권한 | 설명 |
|------|------|
| **주문 권한** | `/order` 페이지 접근 가능 |
| **주방 권한** | `/cooking` 페이지 접근 가능 |
| **관리자 권한** | 모든 페이지 + 직원/메뉴 관리 |

직원별로 필요한 권한만 부여하여 운영할 수 있습니다.

---

## 축제 전 체크리스트

- [ ] 서버용 노트북 또는 PC 준비
- [ ] 카운터용 태블릿/PC 준비
- [ ] 고객용 디스플레이 태블릿 준비
- [ ] 주방용 모니터 또는 태블릿 준비
- [ ] 모든 기기가 같은 WiFi에 연결되었는지 확인
- [ ] `.env` 파일에 비밀번호 설정
- [ ] 메뉴 및 가격 등록 (`/admin-food`)
- [ ] 직원 계정 생성 (`/admin-maker`)
- [ ] 각 페이지 접속 테스트

---

## 네트워크 설정 (같은 WiFi 내)

서버 PC의 로컬 IP를 확인합니다:

```bash
# Windows
ipconfig

# Mac/Linux
ifconfig
```

예: 서버 IP가 `192.168.0.100`인 경우

| 기기 | 접속 주소 |
|------|-----------|
| 고객 디스플레이 | `http://192.168.0.100:3000/stream-customer` |
| 카운터 | `http://192.168.0.100:3000/order` |
| 주방 | `http://192.168.0.100:3000/cooking` |
| 관리자 | `http://192.168.0.100:3000/admin-check` |

---

## 프로젝트 구조

```
src/
  app/
    api/              # API 엔드포인트
    order/            # 주문 페이지 (카운터)
    cooking/          # 주방 디스플레이
    stream-customer/  # 고객 디스플레이
    admin-login/      # 관리자 로그인
    admin-food/       # 메뉴 관리
    admin-check/      # 매출 통계
    admin-maker/      # 직원 관리
    user-login/       # 직원 로그인
  lib/
    db.ts             # 데이터베이스 (SQLite)
    auth.ts           # 세션 인증
    jwt.ts            # JWT 인증
    cart-store.ts     # 장바구니 상태
  types/
    index.ts          # TypeScript 타입
database/
  kiosk.db            # SQLite 데이터베이스 (자동 생성)
```

---

## PM2로 백그라운드 실행 (선택)

```bash
# PM2 설치
npm install -g pm2

# 백그라운드 실행
pm2 start npm --name "kiosk" -- start

# 상태 확인
pm2 status

# 로그 확인
pm2 logs kiosk

# 중지
pm2 stop kiosk
```

---

## 문제 해결

### 다른 기기에서 접속이 안 됩니다
- 모든 기기가 같은 WiFi에 연결되어 있는지 확인
- 서버 PC의 방화벽에서 3000번 포트 허용
- `localhost` 대신 서버의 실제 IP 주소 사용

### 주문이 실시간으로 안 보입니다
- 브라우저 새로고침
- SSE 연결 상태 확인 (개발자 도구 > Network 탭)

### 데이터베이스 초기화
```bash
rm -rf database/kiosk.db*
npm run dev
```

---

## 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능합니다.
