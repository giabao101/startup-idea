# Cù Lao Giêng — Trợ lý du lịch AI

Website du lịch cộng đồng Cù Lao Giêng (An Giang), song ngữ Việt/Anh.

## Tính năng
- **Bản đồ GPS thông minh** (Leaflet + OpenStreetMap): định vị bản thân, điểm gần nhất, lọc theo di tích lịch sử / danh lam thắng cảnh / vườn trái cây / quán ăn / homestay, chỉ đường Google Maps.
- **Hướng dẫn viên AI** (Groq API, model openai/gpt-oss-120b): kể chuyện lịch sử, giải thích kiến trúc & giá trị văn hóa, hỏi đáp, gợi ý lịch trình. Không có API key → tự chạy chế độ ngoại tuyến.
- **Ẩm thực**: món đặc sản, thành phần, giá tham khảo, gợi ý quán ăn.
- **Trải nghiệm cùng người dân**: vườn xoài, vườn trái cây, làm bánh, đi xuồng — gọi / Zalo / gửi yêu cầu đặt lịch.
- **Homestay**: thông tin, giá, đặt phòng.
- **Đặc sản**: giỏ hàng, đặt hàng (lưu vào `data/orders.json`).

## Chạy local
```bash
cp .env.example .env   # điền GROQ_API_KEY (tùy chọn)
npm start              # http://localhost:3000
```
Không cần cài thư viện (Node ≥ 18).

## Sửa nội dung
Toàn bộ dữ liệu ở `public/data/content.json`. Dữ liệu người dân, số điện thoại, tọa độ hiện là **dữ liệu mẫu** — thay bằng thông tin thật trước khi dùng.

## Deploy Render
1. Đẩy code lên GitHub.
2. Render → **New → Blueprint** → chọn repo (dùng `render.yaml`).
3. Nhập `GROQ_API_KEY` khi được hỏi.

Lưu ý: gói Free của Render không lưu file lâu dài — đơn hàng/đặt lịch trong `data/` sẽ mất khi redeploy. Cần database (vd. Render Postgres) nếu dùng thật.

### Chống ngủ (keep-alive)
Gói Free ngủ sau 15 phút không có truy cập. Server tự ping `RENDER_EXTERNAL_URL/health` mỗi 10 phút (đổi bằng `KEEP_ALIVE_MINUTES`, tắt bằng `KEEP_ALIVE=off`). Xem log `[keep-alive]` trong tab **Logs** của Render.
Dự phòng: thêm monitor HTTP miễn phí (cron-job.org, UptimeRobot) gọi `https://<ten-app>.onrender.com/health` mỗi 5–10 phút.
