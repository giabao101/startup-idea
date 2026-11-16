# Cù Lao Giêng — Trợ lý du lịch AI

Website du lịch cộng đồng Cù Lao Giêng (An Giang), song ngữ Việt/Anh.

## Tính năng
- **Bản đồ GPS thông minh** (Leaflet + OpenStreetMap): định vị bản thân, điểm gần nhất, lọc theo di tích lịch sử / danh lam thắng cảnh / vườn trái cây / quán ăn / homestay, chỉ đường Google Maps.
- **Hướng dẫn viên AI** (Grok — xAI API): kể chuyện lịch sử, giải thích kiến trúc & giá trị văn hóa, hỏi đáp, gợi ý lịch trình. Không có API key → tự chạy chế độ ngoại tuyến.
- **Ẩm thực**: món đặc sản, thành phần, giá tham khảo, gợi ý quán ăn.
- **Trải nghiệm cùng người dân**: vườn xoài, vườn trái cây, làm bánh, đi xuồng — gọi / Zalo / gửi yêu cầu đặt lịch.
- **Homestay**: thông tin, giá, đặt phòng.
- **Đặc sản**: giỏ hàng, đặt hàng (lưu vào `data/orders.json`).

## Chạy local
```bash
cp .env.example .env   # điền XAI_API_KEY (tùy chọn)
npm start              # http://localhost:3000
```
Không cần cài thư viện (Node ≥ 18).

## Sửa nội dung
Toàn bộ dữ liệu ở `public/data/content.json`. Dữ liệu người dân, số điện thoại, tọa độ hiện là **dữ liệu mẫu** — thay bằng thông tin thật trước khi dùng.

## Deploy Render
1. Đẩy code lên GitHub.
2. Render → **New → Blueprint** → chọn repo (dùng `render.yaml`).
3. Nhập `XAI_API_KEY` khi được hỏi.

Lưu ý: gói Free của Render không lưu file lâu dài — đơn hàng/đặt lịch trong `data/` sẽ mất khi redeploy. Cần database (vd. Render Postgres) nếu dùng thật.
