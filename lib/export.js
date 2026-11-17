// Exports for the admin panel: CSV that Excel opens with Vietnamese intact (UTF-8 BOM),
// a SQL dump of INSERT statements, and a push to Google Sheets through an Apps Script web app.

// Cells that start with = + - @ could run as formulas in Excel: prefix them with an apostrophe.
const cell = (v) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function csv(columns, rows) {
  const head = columns.map((c) => cell(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => cell(typeof c.value === "function" ? c.value(r) : r[c.key])).join(","));
  return "﻿" + [head, ...body].join("\r\n") + "\r\n";
}

const itemsText = (json) => {
  try { return JSON.parse(json).map((i) => `${i.name} x${i.qty}`).join("; "); } catch { return ""; }
};

const ORDER_COLUMNS = [
  { label: "Mã đơn", key: "id" },
  { label: "Thời gian", value: (r) => new Date(r.created_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) },
  { label: "Trạng thái", key: "status" },
  { label: "Họ tên", key: "name" },
  { label: "Điện thoại", key: "phone" },
  { label: "Email", key: "email" },
  { label: "Địa chỉ", key: "address" },
  { label: "Thanh toán", key: "payment" },
  { label: "Sản phẩm", value: (r) => itemsText(r.items) },
  { label: "Tổng (đ)", key: "total" },
  { label: "Ghi chú", key: "note" },
  { label: "Tài khoản", key: "user_id" },
];

const BOOKING_COLUMNS = [
  { label: "Mã", key: "id" },
  { label: "Thời gian", value: (r) => new Date(r.created_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) },
  { label: "Trạng thái", key: "status" },
  { label: "Dịch vụ", key: "target_name" },
  { label: "Ngày dự kiến", key: "date" },
  { label: "Số người", key: "people" },
  { label: "Họ tên", key: "name" },
  { label: "Điện thoại", key: "phone" },
  { label: "Email", key: "email" },
  { label: "Ghi chú", key: "note" },
  { label: "Tài khoản", key: "user_id" },
];

const sqlVal = (v) => (v == null ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
function sqlDump(tables) {
  const out = [`-- Cù Lao Giêng export ${new Date().toISOString()}`, "BEGIN;"];
  for (const [name, rows] of Object.entries(tables)) {
    for (const r of rows) {
      const cols = Object.keys(r);
      out.push(`INSERT INTO ${name} (${cols.join(", ")}) VALUES (${cols.map((c) => sqlVal(r[c])).join(", ")});`);
    }
  }
  out.push("COMMIT;");
  return out.join("\n") + "\n";
}

// Google Sheets: POST each new order/booking to an Apps Script web app (see docs/google-sheets.gs).
async function pushToSheet(type, row) {
  const url = process.env.SHEETS_WEBHOOK_URL;
  if (!url) return;
  const cols = type === "order" ? ORDER_COLUMNS : BOOKING_COLUMNS;
  const values = cols.map((c) => (typeof c.value === "function" ? c.value(row) : row[c.key] ?? ""));
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: process.env.SHEETS_WEBHOOK_SECRET || "", sheet: type === "order" ? "Đơn hàng" : "Đặt lịch", headers: cols.map((c) => c.label), values }),
      redirect: "follow",
    });
    if (!r.ok) console.warn("[sheets]", type, r.status);
  } catch (e) {
    console.warn("[sheets] push failed:", e.message);
  }
}

module.exports = { csv, sqlDump, pushToSheet, ORDER_COLUMNS, BOOKING_COLUMNS };
