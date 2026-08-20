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

---

## 5. Môi trường & Hệ thống (MỚI)
- **Git**: Lệnh `git` trên hệ thống này nằm tại đường dẫn tuyệt đối: `D:\Program Files\Git\cmd\git.exe` hoặc `D:\Program Files\Git\bin\git.exe`. Mọi tác vụ liên quan đến commit, push, lấy SHA, hay kiểm tra status phải sử dụng đường dẫn tuyệt đối này thay vì dùng alias `git` mặc định.
- Tuyệt đối KHÔNG giả lập git/commit.
