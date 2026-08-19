# DEVELOPMENT_RULES.md - Quy tắc phát triển & Tiêu chuẩn mã nguồn

## 1. Tiêu chuẩn TypeScript & Mã nguồn
- **TypeScript Strict Mode**: Bật 100% trong `tsconfig.json`.
- **Nghiêm cấm kiểu `any`**: Sử dụng interface/type tường minh. Nếu dữ liệu chưa xác định, dùng `unknown` kết hợp type guard hoặc Zod schema.
- **Server Component mặc định**: Mọi component trong `app/` mặc định là React Server Component (RSC), chỉ thêm `'use client'` khi có hook tương tác (`useState`, `useEffect`, `useCallback`, UI events).

---

## 2. Phân chia tầng kiến trúc (Separation of Concerns)
- **UI Layer (`src/components/`)**: Chỉ chịu trách nhiệm hiển thị và tương tác người dùng, không gọi trực tiếp SQL hay database connection.
- **Domain/Service Layer (`src/server/services/`)**: Xử lý logic nghiệp vụ, tính toán tổng tài sản, tính tỷ lệ tăng trưởng, kiểm tra hạn mức ngân sách.
- **Repository/Data Layer (`src/server/repositories/`)**: Nơi duy nhất thực hiện các câu truy vấn Drizzle ORM tới PostgreSQL.
- **Format Layer (`src/lib/format/`)**: Bộ chuyển đổi định dạng chuẩn cho toàn bộ ứng dụng.

---

## 3. Quy tắc Hiệu năng & Truy vấn
- **Chống Query Waterfall**: Sử dụng `Promise.all` khi fetch nhiều nguồn dữ liệu độc lập.
- **Index Optimization**: Luôn đánh chỉ mục (Index) trên các cột thường xuyên query như `user_id`, `transaction_date`, `category_id`.
- **No Over-Animation**: Giao diện tài chính cần tính nghiêm túc, nhanh gọn, mượt mà, không dùng hiệu ứng animation quá đà gây gián đoạn thao tác.

---

## 4. Git & Commit Workflow
- **Commit convention**: Theo chuẩn Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`).
- **Lockfile Integrity**: Luôn commit `pnpm-lock.yaml`. Nghiêm cấm xóa lockfile hoặc dùng dependency `"latest"`.
- **Checklist trước commit**:
  ```powershell
  pnpm lint
  pnpm typecheck
  pnpm build
  ```
