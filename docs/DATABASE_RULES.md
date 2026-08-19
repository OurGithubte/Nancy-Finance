# DATABASE_RULES.md - Quy tắc thiết kế & vận hành Database

## 1. Hệ quản trị Database & ORM
- **Database Engine**: PostgreSQL Serverless trên nền tảng **Neon**.
- **ORM**: **Drizzle ORM** (`drizzle-orm`, `drizzle-kit`).
- **Connection Strategy**: Sử dụng `@neondatabase/serverless` với connection pooling an toàn cho môi trường Serverless / Edge.

---

## 2. Quy tắc tiền tệ & Kiểu dữ liệu số

> **QUY TẮC CỐT TỬ**:
> 1. Mọi trường lưu trữ tiền tệ VND (`amount`, `balance`, `limit`, `paid_amount`, `target_amount`, `allocated_amount`) BẮT BUỘC dùng kiểu **`bigint`** (hoặc `integer` nếu giới hạn < 2 tỷ) với đơn vị tính là **ĐỒNG (VND)**.
> 2. NGHIÊM CẤM sử dụng `float`, `double precision`, `real` hoặc JavaScript standard number (floating point) cho tiền tệ để tránh lỗi làm tròn binary floating-point.
> 3. Lãi suất, tỷ lệ phần trăm (`interest_rate`, `percentage`) sử dụng `numeric(5, 2)` hoặc `decimal`.

---

## 3. Quy ước Đặt tên (Naming Conventions)
- **Tên bảng**: Danh từ số nhiều, viết thường dạng `snake_case` (ví dụ: `transactions`, `credit_cards`, `loan_schedules`).
- **Tên cột**: Danh từ hoặc cụm danh từ `snake_case` (ví dụ: `account_id`, `created_at`, `remaining_amount`).
- **Khóa chính**: Luôn đặt tên là `id`, sử dụng `uuid` hoặc `text` sinh tự động (`crypto.randomUUID()` hoặc cuid2).
- **Khóa ngoại**: `<tên_bảng_số_ít>_id` (ví dụ: `user_id`, `category_id`, `credit_card_id`).
- **Thời gian**: Bắt buộc có `created_at` (mặc định `now()`) và `updated_at` trên tất cả các bảng nghiệp vụ.

---

## 4. Danh mục thực thể (Entities) Phase 0

1. **Authentication (Better Auth schema)**:
   - `users`: Thông tin người dùng (`id`, `name`, `email`, `email_verified`, `image`, `created_at`, `updated_at`).
   - `sessions`: Phiên đăng nhập (`id`, `user_id`, `token`, `expires_at`, `ip_address`, `user_agent`).
   - `accounts_auth`: Liên kết tài khoản auth (`id`, `user_id`, `account_id`, `provider_id`, `access_token`, ...).
   - `verifications`: Token xác thực email/password (`id`, `identifier`, `value`, `expires_at`).

2. **Core Financials**:
   - `accounts`: Tài khoản tiền mặt, ngân hàng, ví điện tử (`id`, `user_id`, `name`, `type`, `balance`, `account_number`, `color`, `icon`, `is_active`).
   - `categories`: Danh mục chi tiêu/thu nhập (`id`, `user_id`, `name`, `type`, `icon`, `color`, `parent_id`).
   - `transactions`: Giao dịch thu, chi, chuyển tiền (`id`, `user_id`, `account_id`, `category_id`, `amount`, `type`, `transaction_date`, `note`, `status`).

3. **Credit Cards**:
   - `credit_cards`: Thẻ tín dụng (`id`, `user_id`, `name`, `card_network`, `last4_digits`, `credit_limit`, `current_balance`, `statement_day`, `due_day`, `color`).
   - `credit_card_transactions`: Giao dịch thanh toán qua thẻ tín dụng.
   - `credit_card_statements`: Lịch sử sao kê hàng tháng.
   - `credit_card_payments`: Lịch sử thanh toán trả nợ thẻ.

4. **Loans & Debts**:
   - `loans`: Khoản vay mua xe, mua nhà, vay tiêu dùng (`id`, `user_id`, `name`, `lender_name`, `total_amount`, `remaining_amount`, `monthly_payment`, `interest_rate`, `total_terms`, `remaining_terms`, `start_date`, `end_date`, `status`).
   - `loan_schedules`: Bảng kế hoạch phân bổ gốc & lãi từng kỳ.
   - `loan_payments`: Lịch sử trả nợ khoản vay.

5. **Planning & Automation**:
   - `budgets`: Hạn mức ngân sách tháng theo danh mục (`id`, `user_id`, `category_id`, `allocated_amount`, `month`, `year`).
   - `saving_goals`: Mục tiêu tiết kiệm (`id`, `user_id`, `name`, `target_amount`, `current_amount`, `target_date`, `icon`, `status`).
   - `recurring_transactions`: Giao dịch định kỳ tự động.
   - `financial_events`: Sự kiện/nhắc nhở tài chính (hạn đóng tiền nhà, hạn trả thẻ, ngày nhận lương).

---

## 5. Quy định Migration
- Mọi thay đổi schema phải được sinh ra qua `pnpm db:generate`.
- Không chỉnh sửa file migration thủ công trừ trường hợp data backfill đặc biệt.
- Sử dụng `pnpm db:push` trong quá trình prototyping hoặc `pnpm db:migrate` khi chạy production deploy.
