# Puvela × Supabase — hướng dẫn nối

## 1. Tạo project & chạy schema
1. Đăng ký / đăng nhập https://supabase.com → **New project**.
2. Vào **SQL Editor → New query** → dán toàn bộ `schema.sql` → **Run**.
   (Tạo bảng brands, products, product_variants, collections, **leads**, reviews, orders + seed 4 sản phẩm mẫu + RLS an toàn.)

## 2. Lấy khoá & điền vào site
1. **Settings → API** → copy **Project URL** và **anon public** key.
2. Mở `assets/supabase.js`, thay 2 dòng đầu:
   ```js
   window.PUVELA_SUPABASE = {
     url: "https://xxxx.supabase.co",
     anonKey: "eyJhbGciOi..."
   };
   ```
> anon key là **public-safe**: RLS chỉ cho khách GHI `leads`/`orders`, không đọc được dữ liệu người khác. Không bao giờ để lộ **service_role** key trên web.

## 3. Kiểm tra
- Mở web → nhập email ở footer → bấm gửi.
- Vào Supabase → **Table editor → leads** → thấy dòng mới `source = newsletter`.
- Làm quiz → nhập email cuối → thấy dòng `source = quiz` kèm `scent_dna`.

## Đang bắt lead ở đâu
| Điểm chạm | source | Dữ liệu |
|---|---|---|
| Form footer "Đừng bỏ lỡ mùi hương tiếp theo" | `newsletter` | email |
| Ô email cuối quiz Scent DNA | `quiz` | email + scent_dna (profile, match) |

## Chưa cấu hình thì sao?
Site vẫn chạy bình thường (hiện "Cảm ơn"), chỉ **chưa lưu** lead — có cảnh báo trong Console. Điền key xong là lưu thật.

## Bước sau (chưa làm)
- Kéo `products`/`collections` từ Supabase thay cho data hard-code trong HTML.
- Checkout: ghi `orders` + `order_items` (COD/Zalo).
- Trang review đọc từ bảng `reviews`.
