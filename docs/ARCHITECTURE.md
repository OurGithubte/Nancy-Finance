# ARCHITECTURE.md - Kiến trúc hệ thống Nancy Finance

## 1. Tổng quan kiến trúc (System Overview)

Nancy Finance là ứng dụng quản lý tài chính cá nhân toàn diện (Personal Finance Management - PFM), tối ưu hóa cho người dùng cá nhân tại Việt Nam với trải nghiệm cao cấp, tính toán chính xác tuyệt đối và kiến trúc hướng serverless hiện đại.

```text
+-----------------------------------------------------------------------+
|                         CLIENT LAYER (Browser / Mobile)               |
|  Next.js 16 App Router (React 19 Server & Client Components)          |
|  Tailwind CSS 4 | shadcn/ui Base UI (@base-ui/react) | Recharts v3    |
+-----------------------------------------------------------------------+
                                    |
                                    v HTTPS / Server Actions / Route Handlers
+-----------------------------------------------------------------------+
|                         SERVER LAYER (Vercel Edge/Serverless)         |
|  - Better Auth (Drizzle Adapter, Secure Server Session)               |
|  - Financial Domain Services (Calculations, Aggregations, Balances)   |
|  - Repositories & Query Optimizers (No N+1, No Waterfalls)            |
+-----------------------------------------------------------------------+
                                    |
                                    v Serverless WebSocket / HTTP Pool
+-----------------------------------------------------------------------+
|                         DATABASE LAYER (Neon PostgreSQL)              |
|  - Drizzle ORM Type-safe schema (18 tables)                           |
|  - Serverless PostgreSQL with auto-scaling & pooling                  |
|  - BigInt monetary units (VND), strict foreign keys & indexing        |
+-----------------------------------------------------------------------+
```

---

## 2. Luồng dữ liệu (Data Flow)

1. **Authentication Flow**:
   - `Better Auth` xử lý session server-side qua cookie HttpOnly.
   - Drizzle Adapter lưu trữ trực tiếp bảng `user`, `session`, `account`, `verification` trong cùng Neon database.
   - Middleware/Server Component kiểm tra session bảo vệ các route `/`, `/transactions`, `/accounts`, v.v.

2. **Financial Operations Flow**:
   - Client gửi yêu cầu (Server Action hoặc API Handler) -> Validation (Zod Schema) -> Domain Service -> Drizzle Repository -> Neon DB.
   - Các phép tính cộng trừ số dư, cập nhật hạn mức, tính lãi suất nợ đều được bọc trong Transaction DB (`db.transaction(...)`).

3. **Rendering Strategy**:
   - **Server Components (RSC)**: Mặc định cho Dashboard page (`src/app/(dashboard)/page.tsx`), Sub-pages, Layout và Data Fetching ban đầu.
   - **Client Components**: Tách biệt thành các interactive islands (Month switcher, Charts interactive tooltips, Form ghi chi tiêu nhanh, Modal/Drawer).

---

## 3. Cấu trúc thư mục chuẩn (Folder Structure)

```text
D:\Nancy Finance/
├── .env.example
├── .env.local
├── AGENTS.md
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DESIGN_SYSTEM.md
│   ├── DATABASE_RULES.md
│   └── DEVELOPMENT_RULES.md
├── drizzle.config.ts
├── next.config.ts
├── package.json
├── pnpm-lock.yaml
├── postcss.config.mjs
├── tsconfig.json
└── src/
    ├── app/
    │   ├── (auth)/
    │   │   ├── login/
    │   │   └── register/
    │   ├── (dashboard)/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx          # Server Component mặc định
    │   │   ├── transactions/
    │   │   ├── accounts/
    │   │   ├── credit-cards/
    │   │   ├── loans/
    │   │   ├── budgets/
    │   │   ├── goals/
    │   │   ├── calendar/
    │   │   ├── reports/
    │   │   └── settings/
    │   ├── api/
    │   │   └── auth/[...all]/
    │   ├── globals.css
    │   └── layout.tsx
    ├── components/
    │   ├── finance/              # 13 Shared Finance Components
    │   │   ├── account-card.tsx
    │   │   ├── budget-progress.tsx
    │   │   ├── credit-card-card.tsx
    │   │   ├── finance-chart.tsx
    │   │   ├── finance-dialog.tsx
    │   │   ├── finance-drawer.tsx
    │   │   ├── finance-empty-state.tsx
    │   │   ├── finance-kpi-card.tsx
    │   │   ├── finance-page-header.tsx
    │   │   ├── loan-card.tsx
    │   │   ├── money-display.tsx
    │   │   ├── nancy-insight-card.tsx
    │   │   ├── transaction-form.tsx
    │   │   └── transaction-table.tsx
    │   ├── layout/               # AppShell (Sidebar, Header, MobileNav)
    │   │   ├── app-header.tsx
    │   │   ├── app-sidebar.tsx
    │   │   └── mobile-nav.tsx
    │   └── ui/                   # Base UI primitives (@base-ui/react)
    │       ├── badge.tsx
    │       ├── button.tsx
    │       ├── card.tsx
    │       ├── dialog.tsx
    │       ├── drawer.tsx
    │       ├── input.tsx
    │       ├── progress.tsx
    │       ├── separator.tsx
    │       └── tabs.tsx
    ├── db/
    │   ├── index.ts              # Neon client + Drizzle instance
    │   ├── migrations/           # Auto-generated migrations (18 tables)
    │   └── schema/               # Drizzle schemas
    │       ├── auth.ts
    │       ├── accounts.ts
    │       ├── categories.ts
    │       ├── transactions.ts
    │       ├── credit-cards.ts
    │       ├── loans.ts
    │       ├── planning.ts
    │       └── index.ts
    ├── lib/
    │   ├── auth/                 # Better Auth server & client
    │   │   ├── auth.ts
    │   │   └── auth-client.ts
    │   ├── format/               # VND, date, percent formatters
    │   │   ├── money.ts
    │   │   └── date.ts
    │   └── utils.ts              # cn helper (clsx + twMerge)
    ├── server/
    │   ├── mock/                 # Mock data cho demo & test
    │   ├── repositories/         # Database access layer
    │   └── services/             # Business logic layer
    └── types/
        └── finance.ts            # Type definitions toàn dự án
```
