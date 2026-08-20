# AGENTS.md - Quy tắc bắt buộc cho AI & Subagents

Dự án **Nancy Finance** được phát triển theo tiêu chuẩn kiến trúc nghiêm ngặt và đã khóa cố định stack từ Phase 0.

> **QUY TẮC CỐT LÕI TỐI THƯỢNG:**
> Không agent/subagent nào được tự ý đổi framework, database, ORM, authentication, package manager hoặc UI system nếu không có yêu cầu trực tiếp từ người dùng.

---

## 1. Công nghệ đã khóa (Strictly Locked Stack)

| Hạng mục | Công nghệ bắt buộc | Nghiêm cấm thay thế bằng |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router) + React 19 | Pages Router, Remix, Vite, Astro, Express riêng |
| **Language** | TypeScript Strict Mode | JavaScript, ts-ignore, any tùy tiện |
| **Styling** | Tailwind CSS v4 + Design Tokens | Styled-components, Emotion, SCSS modules tự do |
| **UI System** | shadcn/ui (Base UI) + Lucide Icons | Material UI, Ant Design, Chakra UI, Mantine |
| **Charts** | Recharts | Chart.js, ApexCharts, Highcharts |
| **Database** | PostgreSQL trên Neon Serverless | SQLite, MySQL, Supabase DB, Firebase Firestore, MongoDB |
| **ORM** | Drizzle ORM (`drizzle-orm`, `drizzle-kit`) | Prisma, TypeORM, Sequelize, Kysely |
| **Authentication** | Better Auth (Drizzle Adapter + Neon) | NextAuth, Supabase Auth, Firebase Auth, Clerk, Auth0 |
| **Package Manager** | `pnpm` (`pnpm-lock.yaml`) | `npm`, `yarn`, `bun` |
| **Hosting / CI-CD** | Vercel + GitHub | AWS EC2 thủ công, Heroku, Render |

---

## 2. Quy tắc tiền tệ & Dữ liệu
- **Đơn vị tiền tệ chuẩn**: `VND`.
- **Kiểu lưu trữ**: `BIGINT` / `INTEGER` theo **đơn vị đồng** (VD: `12.550.000 ₫` lưu `12550000`).
- **Nghiêm cấm**: Sử dụng floating point `float/double/real` để lưu trữ số dư, tiền giao dịch, hạn mức.
- **Format tiền**: Luôn dùng helper tập trung `src/lib/format/money.ts` (`formatVND`, `formatMoneyDisplay`).

---

## 3. Quy tắc Component & UI
- Mọi component giao diện tài chính dùng chung phải nằm trong `src/components/finance/` hoặc `src/components/ui/`.
- Không tạo lại component duplicate (ví dụ: không tạo card tài khoản riêng lẻ trong từng trang).
- Không hardcode mã màu hex rải rác. Sử dụng semantic color tokens: `primary`, `income`, `expense`, `debt`, `credit`, `saving`, `warning`, `surface`, `border`, `muted`.
- Luôn kiểm tra tính tương thích Responsive trên Desktop, Tablet và Mobile.

---

## 4. Quy trình kiểm tra trước khi hoàn thành bất kỳ task nào
Mọi agent sau khi chỉnh sửa code bắt buộc phải chạy và pass 100%:
```powershell
pnpm lint
pnpm typecheck
pnpm build
```
Nếu có lỗi, phải sửa triệt để trước khi báo cáo hoàn thành.

Nếu task có thay đổi schema/database, bắt buộc chạy thêm:
```powershell
pnpm db:verify
```

---

## 5. Môi trường & Hệ thống
- **Git**: Lệnh `git` trên hệ thống này nằm tại đường dẫn tuyệt đối: `D:\Program Files\Git\cmd\git.exe` hoặc `D:\Program Files\Git\bin\git.exe`. Mọi tác vụ liên quan đến commit, push, lấy SHA, hay kiểm tra status phải sử dụng đường dẫn tuyệt đối này thay vì dùng alias `git` mặc định.
- Tuyệt đối KHÔNG giả lập git/commit.

---

## 6. Quy tắc Database Migration — BẮT BUỘC

### 6.1. Một nguồn sự thật duy nhất
- Migration source duy nhất: `src/db/migrations/` do Drizzle quản lý.
- Migration history duy nhất trong database: `drizzle.__drizzle_migrations`.
- Không được tạo hoặc sử dụng `public.__drizzle_migrations`.
- Không được tự INSERT/UPDATE/DELETE migration history bằng script thủ công.

### 6.2. Tuyệt đối cấm fake migration
Nghiêm cấm mọi hình thức:
- Chỉ ghi hash/timestamp vào `drizzle.__drizzle_migrations` mà chưa chạy SQL migration.
- Tự thêm entry vào `meta/_journal.json` nếu không có đầy đủ file `.sql` và snapshot tương ứng.
- Tự chỉnh `meta/_journal.json` hoặc snapshot để làm cho migration "trông như đã chạy".
- Bỏ qua lỗi migration bằng cách đánh dấu migration đã hoàn tất.

`scripts/insert-migrations.ts` đã bị khóa cố ý và không được phục hồi hành vi cũ.

### 6.3. Schema change bắt buộc đi qua migration
Quy trình chuẩn:
```powershell
pnpm db:generate
pnpm db:verify
pnpm db:migrate
pnpm db:verify
```

- Không sửa schema production bằng SQL ad-hoc nếu chưa có migration source tương ứng, trừ hotfix khẩn cấp được người dùng phê duyệt; sau hotfix phải reconcile migration source/history ngay.
- Không dùng `drizzle-kit push` cho production.
- `pnpm db:push` chỉ được phép khi `DB_ENV=development` hoặc `DB_ENV=test`.

### 6.4. Production migration guard
- `DB_ENV` phải được khai báo rõ: `development`, `test`, hoặc `production`.
- Khi `DB_ENV=production`, `pnpm db:migrate` chỉ được chạy khi người dùng đã review migration và command hiện tại có:
  `ALLOW_PRODUCTION_DB_MIGRATION=YES_I_UNDERSTAND`
- Không lưu permanent flag này trong `.env.local` hoặc Vercel Environment Variables.

### 6.5. Verify scripts phải read-only
- Script tên `verify`, `check`, `audit` mặc định chỉ được SELECT/read.
- Không được CREATE/ALTER/DROP/INSERT/UPDATE/DELETE database trong script verification.
- Runtime test có ghi dữ liệu phải dùng dedicated test user, cleanup bằng `finally`, và không được lấy user thật bằng `.limit(1)` hoặc tương tự.

### 6.6. Trước khi báo cáo PASS
Nếu task liên quan database/migration, agent phải xác nhận tối thiểu:
- journal ↔ SQL files ↔ snapshots khớp nhau;
- SHA256 migration source khớp migration history đã apply;
- migration timestamps đúng thứ tự Drizzle;
- không tồn tại legacy `public.__drizzle_migrations`;
- không có schema drift ở các bảng/cột task vừa thay đổi;
- `pnpm db:verify` PASS.

Nếu bất kỳ mục nào FAIL, không được ghi `PASS` và không được bắt đầu phase tiếp theo.
