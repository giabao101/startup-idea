/**
 * Cù Lao Giêng: ghi đơn hàng và đặt lịch mới vào Google Sheet.
 *
 * Cách dùng:
 * 1. Tạo một Google Sheet mới (sheets.new). Sao chép đường link của nó.
 * 2. Trong Sheet: Tiện ích mở rộng (Extensions) > Apps Script. Xóa code mẫu, dán toàn bộ file này.
 * 3. Đổi SECRET bên dưới thành một chuỗi bí mật bất kỳ (giống biến SHEETS_WEBHOOK_SECRET trên Render).
 * 4. Triển khai (Deploy) > Tùy chọn triển khai mới (New deployment) > loại "Ứng dụng web" (Web app):
 *      - Thực thi dưới tư cách (Execute as): Tôi (Me)
 *      - Người có quyền truy cập (Who has access): Bất kỳ ai (Anyone)
 *    Bấm Triển khai, cấp quyền, rồi sao chép "URL ứng dụng web" (kết thúc bằng /exec).
 * 5. Trên Render > Environment:
 *      SHEETS_WEBHOOK_URL    = URL ứng dụng web vừa sao chép
 *      SHEETS_WEBHOOK_SECRET = chuỗi SECRET ở bước 3
 *      GOOGLE_SHEET_URL      = link của Google Sheet (để nút "Mở Google Sheet" trong trang quản trị dùng)
 * Mỗi đơn mới sẽ thêm một dòng vào trang "Đơn hàng", mỗi lịch đặt vào trang "Đặt lịch".
 */
const SECRET = "doi-chuoi-nay";

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  if (data.secret !== SECRET) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: "secret" })).setMimeType(ContentService.MimeType.JSON);
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const name = data.sheet === "Đặt lịch" ? "Đặt lịch" : "Đơn hàng";
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(data.headers);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, data.headers.length).setFontWeight("bold");
  }
  // Treat every value as text so phone numbers keep their leading zero.
  sh.appendRow(data.values.map((v) => (typeof v === "number" ? v : "'" + String(v))));
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}
