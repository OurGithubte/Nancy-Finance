# Nancy Finance - Quản lý tài chính cá nhân

Nancy Finance là nền tảng quản lý tài chính cá nhân (Personal Finance Management - PFM) cao cấp, hiện đại, tối ưu cho người dùng Việt Nam với đơn vị tiền tệ VND, hệ thống thiết kế giao diện tối chuẩn mực và kiến trúc serverless vững chắc.

---

## 1. Công nghệ (Strictly Locked Stack)

- **Framework**: Next.js 16 (App Router) + React 19
- **Ngôn ngữ**: TypeScript Strict Mode
- **Styling**: Tailwind CSS v4 + Semantic Design Tokens
- **UI Components**: Base UI / shadcn/ui + Lucide Icons + Recharts
- **Database**: Serverless PostgreSQL trên Neon
- **ORM**: Drizzle ORM (`drizzle-orm`, `drizzle-kit`)
- **Authentication**: Better Auth (Drizzle Adapter)
- **Package Manager**: `pnpm` (`pnpm-lock.yaml`)
- **Hosting & Deploy**: GitHub + Vercel Production

---

## 2. Cài đặt & Khởi chạy dự án

### Yêu cầu môi trường
- Node.js >= 20
- pnpm >= 9

### Các bước cài đặt:

1. **Cài đặt dependencies**:
   ```bash
   pnpm install
   ```

2. **Cấu hình biến môi trường**:
   Sao chép file `.env.example` thành `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
   Cập nhật `DATABASE_URL` từ Neon PostgreSQL và `BETTER_AUTH_SECRET`.

3. **Chạy Migration Database**:
   ```bash
   pnpm db:generate
   pnpm db:push
   ```

4. **Chạy môi trường Development**:
   ```bash
   pnpm dev
   ```
   Mở trình duyệt tại: [http://localhost:3000](http://localhost:3000)

---

## 3. Kiểm tra chất lượng mã nguồn (Quality Checks)

Trước khi commit bất kỳ thay đổi nào:

```bash
# Kiểm tra lint
pnpm lint

# Kiểm tra typecheck nghiêm ngặt
pnpm typecheck

# Build kiểm tra production
pnpm build
```

---

## 4. Cấu trúc mã nguồn

- `src/app/`: App router pages & layouts.
- `src/components/finance/`: 13 shared finance components.
- `src/components/layout/`: AppShell (Sidebar, Header, MobileNav).
- `src/db/`: Neon connection, Drizzle schema tables & migrations.
- `src/lib/`: Formatters (`money.ts`, `date.ts`), Auth helpers, utilities.
- `src/server/`: Domain mock data, Repositories, Services.
- `src/types/`: TypeScript definitions toàn hệ thống.
- `docs/`: Tài liệu kiến trúc, design system, database rules và development rules.
