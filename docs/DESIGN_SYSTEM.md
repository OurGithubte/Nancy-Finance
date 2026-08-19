# DESIGN_SYSTEM.md - Hệ thống thiết kế Nancy Finance

Phong cách thiết kế: **Modern Premium Personal Finance Dashboard**
Đặc trưng: Giao diện tối hiện đại (Modern Dark Dashboard), độ tương phản cao, phân cấp thị giác rõ ràng, màu sắc ngữ nghĩa tài chính trực quan, density tối ưu cho dữ liệu số liệu dày đặc.
UI Primitives: Xây dựng trên nền tảng **Base UI (`@base-ui/react`)** kết hợp **Tailwind CSS v4 Semantic Tokens**.

---

## 1. Bảng màu Semantic Tokens (Semantic Color Tokens)

| Token | Mã màu Hex | Ý nghĩa ngữ nghĩa | Ứng dụng |
| :--- | :--- | :--- | :--- |
| **`primary`** | `#10B981` | Thương hiệu chính, hành động quan trọng | Nút chính, icon active, logo, điểm nhấn |
| **`income`** | `#22C55E` | Dòng tiền dương, thu nhập | Số tiền thu nhập (+), badge tăng trưởng tài sản |
| **`expense`** | `#EF4444` | Dòng tiền âm, chi tiêu | Số tiền chi tiêu (-), badge tăng chi tiêu |
| **`debt`** | `#DC2626` | Dư nợ, khoản vay rủi ro | Dư nợ khoản vay, cảnh báo vượt hạn mức |
| **`credit`** | `#3B82F6` | Thẻ tín dụng, hạn mức | Biểu đồ thẻ tín dụng, badge tiện ích |
| **`saving`** | `#8B5CF6` | Tiết kiệm, đầu tư, mục tiêu | Thanh tiến độ tiết kiệm, ví tích lũy |
| **`warning`** | `#F59E0B` | Cảnh báo ngân sách, hạn nợ sắp tới | Hạn thanh toán < 3 ngày, gần chạm trần budget |
| **`background`**| `#0F172A` | Nền ứng dụng chính | Slate-900 nền toàn màn hình |
| **`surface`** | `#111827` / `#1E293B` | Nền card, widget, panel | Card surface, sidebar, header |
| **`border`** | `#1F2937` / `#334155` | Đường viền phân cách | Border card, table line, divider |
| **`muted`** | `#94A3B8` | Chữ phụ, nhãn thứ cấp | Label, helper text, icon phụ |

---

## 2. Typography

- **Font Family**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`, `sans-serif`
- **Font Weights**:
  - `Regular` (400): Văn bản miêu tả, phụ chú
  - `Medium` (500): Tên danh mục, nhãn dữ liệu, tiêu đề phụ
  - `SemiBold` (600): Tiêu đề card, số tiền nhỏ, nút bấm
  - `Bold` (700): Số tiền KPI lớn, tiêu đề chính của trang

---

## 3. Quy chuẩn Hiển thị Tiền tệ (Currency Standard)

- Mọi số tiền hiển thị bắt buộc qua hàm `formatVND(amount)`:
  - `532450000` -> `532.450.000 ₫`
  - `23750000` -> `23.750.000 ₫`
- Khi hiển thị rút gọn trên biểu đồ / không gian nhỏ (`formatCompactVND`):
  - `23750000` -> `23.75M`
  - `532450000` -> `532.45M`

---

## 4. Danh mục Shared Finance Components & Base UI Primitives

### Shared Finance Components (`src/components/finance/`):
1. **`FinancePageHeader`**: Tiêu đề trang + Bộ chọn tháng (`< Tháng 5, 2025 >`) + Action buttons + Nút thông báo.
2. **`FinanceKpiCard`**: Thẻ KPI hiển thị số dư, % tăng giảm so với tháng trước, icon chuyên biệt.
3. **`MoneyDisplay`**: Component số tiền với cấu hình kích thước (`sm`, `md`, `lg`, `xl`, `2xl`), loại biến động (`income`, `expense`, `debt`, `credit`, `saving`, `warning`, `primary`, `neutral`).
4. **`FinanceChart`**: Wrapper Recharts v3 (Donut chart phân bổ chi tiêu, Line/Area chart xu hướng 12 tháng).
5. **`AccountCard`**: Thẻ tài khoản hiển thị logo ngân hàng/ví, tên tài khoản, số dư khả dụng.
6. **`CreditCardCard`**: Thẻ tín dụng với 4 số cuối, hạn mức, đã chi, còn lại, ngày sao kê và hạn trả.
7. **`LoanCard`**: Thẻ khoản vay hiển thị dư nợ gốc, số tiền trả mỗi tháng, số kỳ còn lại và tiến độ thanh toán.
8. **`BudgetProgress`**: Thanh tiến độ chi tiêu theo ngân sách kèm cảnh báo đổi màu theo ngưỡng (% < 80% xanh, 80-100% vàng, > 100% đỏ).
9. **`TransactionTable`**: Bảng lịch sử giao dịch hiển thị icon danh mục, tên giao dịch, tài khoản nguồn, ngày giờ và số tiền.
10. **`TransactionForm`**: Form ghi nhanh giao dịch (Thu / Chi / Chuyển khoản) với các trường chọn danh mục, tài khoản, số tiền và ghi chú.
11. **`FinanceDialog`**: Hộp thoại modal chuẩn hóa trên Desktop.
12. **`FinanceDrawer`**: Khung trượt từ dưới lên (Bottom Sheet) tối ưu trải nghiệm chạm trên Mobile.
13. **`FinanceEmptyState`**: Mẫu hiển thị chuẩn khi danh sách tài khoản, giao dịch hoặc ngân sách trống.
14. **`NancyInsightCard`**: AI Insight cảnh báo phân tích chi tiêu thông minh.

### Base UI Primitives (`src/components/ui/`):
- `Button`: Biến thể `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`.
- `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
- `Badge`: Biến thể semantic tokens (`default`, `income`, `expense`, `debt`, `credit`, `saving`, `warning`, `outline`).
- `Progress`: Thanh tiến độ linh hoạt chỉ thị theo percentage.
- `Input`: Trường nhập văn bản, mật khẩu, số.
- `Separator`: Đường kẻ ngang/dọc phân chia bố cục.
- `Tabs`, `TabsList`, `TabsTrigger`: Chuyển đổi tab tương tác.
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`.
- `Drawer`, `DrawerContent`, `DrawerHeader`, `DrawerTitle`, `DrawerDescription`.
