# Phase 2: Admin Dashboard & Feature Parity

**Goal**: Achieve feature parity with current salon management system

---

## Overview

Based on the current system screenshots, Phase 2 will build the admin dashboard to match all existing functionality. This represents a comprehensive salon management system with booking, operations, analytics, and administration features.

---

## Feature Categories

### 1. 📅 Admin Booking Management (予約管理画面)

**Priority: HIGH** - Core admin functionality

#### 1.1 Weekly Calendar View
- Multi-row timeline showing workers + resources (beds)
- Time slots from opening to closing (e.g., 10:00-21:00)
- Color-coded bookings with customer info overlay:
  - Customer name
  - Service name
  - Time range
  - Price
  - Ticket count (券)
  - Bed assignment

#### 1.2 Calendar Controls
- Date navigation (previous/next day, date picker)
- View mode filters:
  - シフト (Shift): Show only staff schedules
  - ブース (Booth): Show only resource schedules
  - 両方 (Both): Show combined view
- Time interval adjustment (15/30/60 min)
- Shift lock feature (prevent booking changes)

#### 1.3 Booking CRUD
- Click slot to create booking
- Drag to adjust time
- Click booking to view/edit/cancel
- Staff assignment
- Resource assignment
- Notes field

#### 1.4 Integration
- "Salon board info sync" button to update external display
- Real-time updates across admin users

---

### 2. 💰 Store Operations (店舗業務)

**Priority: HIGH** - Daily operational needs

#### 2.1 Sales Rankings (売上ランキング)
- **Store Rankings**:
  - Rank, store name, sales, difference from #1
  - Date range selector (last 7/14/30 days, custom)

- **Staff Rankings**:
  - Rank, staff name, affiliated store, sales, difference from #1
  - Daily breakdown table (last 30 days)
  - Sortable columns

#### 2.2 Sales Ledger (売上台帳)
- **12-Month Chart**:
  - Total sales (総合売上) - bar chart
  - New customer sales (新規売上) - overlaid bar chart
  - Month navigation

- **Daily Sales Table**:
  - Date (日付)
  - Total sales (総合売上)
  - New customer sales (新規売上)
  - Collected sales (回収売上)
  - Consumed sales (消化売上)
  - New customer count (新規数)
  - Existing customer count (既存数)
  - Next appointment rate (次回予約率)
  - Repeat rate (リピート率)

- **Monthly Summary**:
  - Filters and sorting
  - Staff metrics (LTV, new LTV, retention rate)
  - Staff visibility toggle (show/hide individual performance)

#### 2.3 Store Closing (閉店処理)
- **Cash Register Count** (レジ内にある現金):
  - Denomination table: ¥10,000, ¥5,000, ¥1,000, ¥500, ¥100, ¥50, ¥10, ¥5, ¥1
  - Columns: Bills (本数), Coins (枚数), Total (合計)
  - Auto-calculation
  - Expected vs actual comparison
  - Discrepancy alerts

- **Daily Summary**:
  - Total cash
  - Card payments
  - Other payments
  - Expected total
  - Variance

- **History**:
  - Link to previous closing records (閉店処理一覧)

#### 2.4 Shift Management (シフト管理)
- **Monthly Calendar**:
  - Rows: Dates (with day of week)
  - Columns: Staff members
  - Checkboxes for scheduled days
  - Color coding: scheduled ✓, off ☐

- **Features**:
  - Month navigation
  - "Copy previous month" button (別月のシフトをコピー)
  - Bulk edit mode
  - Export to CSV/PDF

---

### 3. 🏪 Store Management (店舗管理)

**Priority: MEDIUM** - Configuration & admin

#### 3.1 Store Information (店舗情報編集)
- Company ID (企業ID)
- Store ID (店舗ID)
- Store name (店舗名)
- Short store name (短縮店舗名)
- Postal code (郵便番号)
- Prefecture (都道府県)
- City/ward (市区町村番地)
- Building (住所2)
- Phone number (電話番号)
- Fax number (FAX番号)
- Email address (メールアドレス)
- Homepage URL (ホームページURL)

#### 3.2 Staff Management (スタッフ管理)
- **List View**:
  - ID
  - Name (名前)
  - Display order (表示順序)
  - Edit/Delete buttons
  - Pagination (25/50/100 per page)

- **Staff Form**:
  - Name (Japanese)
  - Name (English)
  - Display order
  - Active status
  - Assigned store(s)
  - Profile photo upload
  - Bio/description

#### 3.3 Booth Management (ブース管理)
- Same structure as staff management
- Booth name (e.g., ベッド1, ベッド2, ベッド3)
- Display order
- Active status

#### 3.4 Medical Record Items (カルテ項目管理)
- **List View**:
  - Title (タイトル)
  - Content type (コンテンツタイプ): Text, Image
  - Public (公開): Yes/No
  - Display order (表示順序)

- **Item Types**:
  - 症状の状態 (Symptom status)
  - 施術へのご要望 (Treatment requests)
  - 施術時のフィードバック (Treatment feedback)
  - お客様自身でやってほしいこと (Customer self-care)
  - 来店時の状態 (Condition at visit) - Image
  - 施術後の状態 (Condition after treatment) - Image

---

### 4. 🛍️ Product Management (商品管理)

**Priority: MEDIUM** - Product catalog

#### 4.1 Treatment Categories (施術カテゴリ)
- **List View**:
  - ID
  - Name (名前)
  - Display order (表示順序)
  - Edit/Delete

- **Example Categories**:
  - 初回限定キャンペーン (First-time campaign)
  - 回数券消化 (Ticket package usage)
  - 回数券終了 (Ticket package ended)
  - サブスク (Subscription)
  - 都度払い (Pay-per-use)
  - VIP施術 (VIP treatment)
  - LINE紹介限定 (LINE referral only)

#### 4.2 Treatment Courses (施術コース)
- **List View**:
  - ID
  - Category (カテゴリ)
  - Name (名前)
  - Price including tax (施術料金 税込)
  - Display order (表示順序)
  - Online booking enabled (オンライン予約)
  - Edit/Delete

- **Course Form**:
  - Category selection
  - Name (Japanese)
  - Name (English)
  - Description
  - Duration (minutes)
  - Price
  - Display order
  - Enable for online booking
  - Image upload

#### 4.3 Treatment Options (施術オプション)
- **List View**:
  - ID
  - Name (名前)
  - Price including tax (施術料金 税込)
  - Display order (表示順序)

- **Example Options**:
  - Quick (¥4,400)
  - 紹介 (Referral) (¥5,500)
  - ほ6回券 (6-session ticket) (¥68,400)
  - ほ10回券 (10-session ticket) (¥109,000)
  - ほ15回券 (15-session ticket) (¥145,000)
  - 50回券 (50-session ticket) (¥412,500)
  - ほ50回件 (50-session package) (¥435,000)
  - 3回券, 6回券 (3/6-session tickets)
  - 単発通常 (Single regular)

#### 4.4 Product Categories (物販カテゴリ)
- Structure similar to treatment categories
- For retail products (supplements, skincare, etc.)

#### 4.5 Products (物販商品)
- Product catalog for retail items
- Inventory tracking (future phase)

---

### 5. 👥 Customer Management (顧客管理)

**Priority: HIGH** - Customer relationship management

#### 5.1 Customer List (顧客一覧)
- **Columns**:
  - Store (店舗)
  - ID
  - Name (名前)
  - Phone number (電話番号)
  - Person in charge (担当者) - assigned staff
  - Visit count (来店回数)
  - Last visit date (直近来店日)
  - Next appointment (次回予約日)
  - Latest appointment (最終予約日)
  - Registration date (登録日)
  - Outstanding amount (未収金額)
  - Edit/Delete buttons

- **Filters**:
  - Store filter (default to current store)
  - Search by name, phone, email
  - Filter by担当者 (person in charge)
  - Sort by various columns
  - Pagination

#### 5.2 Customer Detail View
- Basic info (from registration)
- Visit history table
- Booking history
- Treatment notes (カルテ)
- Photos (before/after)
- Outstanding payments
- Ticket package balances
- Communication history (emails sent)

#### 5.3 Customer Medical Records (カルテ)
- Custom fields defined in カルテ項目管理
- Text fields with rich formatting
- Image uploads
- Date-stamped entries
- Staff who entered the note
- Edit/delete by authorized staff only

---

### 6. 📧 Email History (メール履歴)

**Priority: LOW** - Communication tracking

#### 6.1 Email List
- **Columns**:
  - ID
  - Customer ID (顧客ID)
  - Customer name (顧客名)
  - Recipient email (宛先メール)
  - Email title (メールタイトル)
  - Send time (配信日時)
  - Delivery status (配信状況): 配信済み, 失敗
  - Details button (詳細)

- **Email Detail View**:
  - Full email content
  - Send time
  - Delivery status
  - Bounce information (if failed)

#### 6.2 Email Templates (Future)
- Booking confirmation
- Booking reminder (day before)
- Thank you after visit
- Follow-up campaigns
- Birthday messages

---

### 7. 🔧 Tools (ツール)

**Priority: MEDIUM** - Utility features

#### 7.1 Booking Page Link Generation (予約ページリンク発行)
- Generate unique booking links
- Per-staff links
- Per-service links
- Campaign-specific links
- QR code generation
- Analytics tracking

#### 7.2 Data Export (CSV出力)
- **Customer Data Export** (顧客データCSV出力):
  - All customer records
  - Filtered exports
  - Configurable columns

- **Booking Data Export** (予約データCSV出力):
  - Date range selection
  - Booking details with customer info

- **Settlement Data Export** (精算データCSV出力):
  - Financial records
  - Payment breakdowns

- **Staff Data Export** (スタッフデータCSV出力):
  - Staff records
  - Performance metrics

---

## Technical Considerations

### Authentication & Authorization
- Admin user roles: Owner, Manager, Staff
- Permission levels per feature area
- Staff can only see own schedule/customers
- Managers can see all staff in their store
- Owners can see all stores

### Database Schema Additions
```prisma
model Store {
  id              String   @id @default(cuid())
  companyId       String
  storeId         String   @unique
  name            String
  shortName       String?
  postalCode      String?
  prefecture      String?
  city            String?
  building        String?
  phone           String?
  fax             String?
  email           String?
  homepageUrl     String?
  // Relations
  workers         Worker[]
  resources       Resource[]
  bookings        Booking[]
  customers       Customer[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model TreatmentCategory {
  id              String   @id @default(cuid())
  name            String
  displayOrder    Int      @default(0)
  isActive        Boolean  @default(true)
  services        Service[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model TreatmentOption {
  id              String   @id @default(cuid())
  name            String
  price           Int
  displayOrder    Int      @default(0)
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model MedicalRecordItem {
  id              String   @id @default(cuid())
  title           String
  contentType     String   // 'text' | 'image'
  isPublic        Boolean  @default(false)
  displayOrder    Int      @default(0)
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model MedicalRecord {
  id              String   @id @default(cuid())
  customerId      String
  customer        Customer @relation(fields: [customerId], references: [id])
  itemId          String
  item            MedicalRecordItem @relation(fields: [itemId], references: [id])
  content         String?
  imageUrl        String?
  enteredBy       String   // Staff who entered
  enteredAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Shift {
  id              String   @id @default(cuid())
  workerId        String
  worker          Worker   @relation(fields: [workerId], references: [id])
  date            DateTime @db.Date
  isScheduled     Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([workerId, date])
  @@index([date])
}

model CashRegisterClose {
  id              String   @id @default(cuid())
  storeId         String
  date            DateTime @db.Date
  bills10000      Int      @default(0)
  bills5000       Int      @default(0)
  bills1000       Int      @default(0)
  coins500        Int      @default(0)
  coins100        Int      @default(0)
  coins50         Int      @default(0)
  coins10         Int      @default(0)
  coins5          Int      @default(0)
  coins1          Int      @default(0)
  totalCash       Int
  cardPayments    Int      @default(0)
  otherPayments   Int      @default(0)
  expectedTotal   Int
  variance        Int
  closedBy        String   // Staff who closed
  closedAt        DateTime @default(now())

  @@unique([storeId, date])
}

model EmailHistory {
  id              String   @id @default(cuid())
  customerId      String
  customer        Customer @relation(fields: [customerId], references: [id])
  recipientEmail  String
  subject         String
  body            String   @db.Text
  status          String   // 'sent' | 'failed' | 'bounced'
  sentAt          DateTime

  @@index([customerId])
  @@index([sentAt])
}

// Extend existing models
model Customer {
  // ... existing fields
  assignedStaffId String?
  visitCount      Int      @default(0)
  lastVisitDate   DateTime?
  outstandingAmount Int    @default(0)
  medicalRecords  MedicalRecord[]
  emailHistory    EmailHistory[]
}

model Service {
  // ... existing fields
  categoryId      String?
  category        TreatmentCategory? @relation(fields: [categoryId], references: [id])
  enableOnlineBooking Boolean @default(true)
  imageUrl        String?
  descriptionJa   String?  @db.Text
  descriptionEn   String?  @db.Text
  displayOrder    Int      @default(0)
}

model Booking {
  // ... existing fields
  ticketCount     Int?     // Number of tickets used
  consumedAmount  Int?     // Amount consumed from ticket package
  notes           String?  @db.Text
}
```

---

## Phase Breakdown Recommendation

Given the scope, recommend splitting Phase 2 into sub-phases:

### Phase 2.1: Admin Booking Management
- Weekly calendar view
- Booking CRUD operations
- Staff + resource scheduling
- Real-time updates

### Phase 2.2: Store Operations
- Sales rankings
- Sales ledger with charts
- Store closing process
- Shift management

### Phase 2.3: Product Management
- Treatment categories
- Treatment courses
- Treatment options
- Online booking toggle

### Phase 2.4: Customer Management
- Customer list with filters
- Customer detail view
- Medical records (カルテ)
- Visit history

### Phase 2.5: Store Configuration
- Store information
- Staff management
- Booth management
- Medical record item templates

### Phase 2.6: Tools & Integrations
- Email history
- CSV exports
- Booking link generation
- External system sync

---

## Success Criteria

✅ Admin can view weekly calendar with all bookings
✅ Admin can create/edit/delete bookings
✅ Sales data displayed accurately with charts
✅ Store closing process completes successfully
✅ Shift calendar allows bulk scheduling
✅ Customer list filterable and sortable
✅ Medical records stored and retrievable
✅ Product catalog managed through admin UI
✅ CSV exports work for all data types
✅ Permission system prevents unauthorized access

---

## Out of Scope for Phase 2

- Mobile app (separate phase)
- Payment processing integration (Phase 3)
- Inventory management (Phase 3)
- Multi-store management (Phase 3)
- Advanced analytics/BI (Phase 4)
- Customer loyalty programs (Phase 4)
- Marketing automation (Phase 4)

---

## Next Steps

1. Review this feature map with stakeholders
2. Prioritize sub-phases based on business needs
3. Create detailed user stories for Phase 2.1
4. Design database schema migrations
5. Create wireframes/mockups for admin UI
6. Plan authentication/authorization implementation
