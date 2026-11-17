// Cù Lao Giêng travel site — Node server (Node 22.5+).
// Serves /public, proxies the AI guide to the Groq API (OpenAI-compatible), stores accounts, orders and
// bookings in SQL (PostgreSQL via DATABASE_URL, or local SQLite), syncs new orders to Google Sheets.
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// --- load .env (simple parser) ---
const envFile = path.join(__dirname, ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const PORT = Number(process.env.PORT) || 3000;
const API_KEY = process.env.GROQ_API_KEY || "";
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const REASONING = /gpt-oss|qwen3/.test(MODEL); // reasoning models: keep thinking short, answer only
const PUBLIC = path.join(__dirname, "public");
const STORE = path.join(__dirname, "data");
fs.mkdirSync(STORE, { recursive: true });

const CONTENT = JSON.parse(fs.readFileSync(path.join(PUBLIC, "data", "content.json"), "utf8"));
const { open: openDb } = require("./lib/db");
const { hashPassword, verifyPassword, makeTokens, rateLimiter } = require("./lib/auth");
const { csv, sqlDump, pushToSheet, ORDER_COLUMNS, BOOKING_COLUMNS } = require("./lib/export");
const tokens = makeTokens(STORE);
const authLimit = rateLimiter(10, 15 * 60 * 1000);
let db; // opened before the server starts listening

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon",
};

// --- knowledge base for the AI guide ---
function knowledgeBase() {
  const p = CONTENT.places.map((x) => `- ${x.name.vi} / ${x.name.en} (${x.cat}, ${x.lat},${x.lng}): ${x.story.vi} Kiến trúc: ${x.arch.vi} Lưu ý: ${x.tips.vi}`).join("\n");
  const f = CONTENT.foods.map((x) => `- ${x.name.vi} / ${x.name.en}: ${x.desc.vi} Thành phần: ${x.ingredients.vi}. Giá: ${x.price}`).join("\n");
  const e = CONTENT.eateries.map((x) => `- ${x.name}: ${x.dishes.vi}, ${x.price}, giờ ${x.hours}, ĐT ${x.phone}`).join("\n");
  const ex = CONTENT.experiences.map((x) => `- ${x.name.vi}: ${x.desc.vi} Chủ: ${x.host}, mùa: ${x.season.vi}, giá: ${x.price}, ĐT ${x.phone}`).join("\n");
  const h = CONTENT.homestays.map((x) => `- ${x.name}: ${x.desc.vi} Giá ${x.price}, ĐT ${x.phone}`).join("\n");
  const pr = CONTENT.products.map((x) => `- ${x.name.vi}: ${x.price}đ/${x.unit.vi} (người bán ${x.seller})`).join("\n");
  return `ĐIỂM THAM QUAN:\n${p}\n\nMÓN ĂN:\n${f}\n\nQUÁN ĂN:\n${e}\n\nTRẢI NGHIỆM:\n${ex}\n\nHOMESTAY:\n${h}\n\nSẢN PHẨM BÁN TRÊN WEB:\n${pr}`;
}

function systemPrompt(lang, userPos) {
  return `Bạn là hướng dẫn viên du lịch AI thân thiện của Cù Lao Giêng (Chợ Mới, An Giang, Việt Nam) — cù lao giữa sông Tiền, nổi tiếng là "vùng đất thánh" với nhà thờ, tu viện cổ và vườn xoài.
Nhiệm vụ: giới thiệu lịch sử, giải thích kiến trúc và giá trị văn hóa, kể chuyện lịch sử sinh động, gợi ý món ăn, quán ăn, giá cả, trải nghiệm vườn trái cây, homestay, lịch trình.
Trả lời bằng ${lang === "en" ? "TIẾNG ANH (English)" : "TIẾNG VIỆT"}, ngắn gọn (tối đa ~200 từ), dùng gạch đầu dòng khi liệt kê. Chỉ viết văn bản thuần: không dùng markdown, không dùng ** hay #.
Ưu tiên dữ liệu dưới đây. Nếu không chắc chắn một sự kiện lịch sử (năm, tên người), hãy nói rõ là chưa chắc thay vì bịa. Dữ liệu người dân/quán/homestay hiện là dữ liệu mẫu (demo).
Khi gợi ý trải nghiệm, homestay hoặc mua hàng, nhắc khách dùng nút "Đặt lịch" / "Thêm vào giỏ" trên website.
${userPos ? `Vị trí hiện tại của khách: ${userPos.lat},${userPos.lng}.` : ""}

DỮ LIỆU:
${knowledgeBase()}`;
}

// Groq API (OpenAI-compatible chat completions)
async function callAI(messages, lang, userPos) {
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      max_completion_tokens: 2000,
      temperature: 0.6,
      ...(REASONING ? { reasoning_effort: "low", reasoning_format: "hidden" } : {}),
      messages: [{ role: "system", content: systemPrompt(lang, userPos) }, ...messages],
    }),
  });
  if (!r.ok) throw new Error(`Groq API ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return plainText(j.choices?.[0]?.message?.content || "");
}

// The chat bubbles show plain text: drop markdown marks the model may still emit.
function plainText(t) {
  return t
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/(^|\s)\*(\S[^*]*?)\*(?=\s|[.,!?]|$)/g, "$1$2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Offline fallback: keyword search over the knowledge base
function offlineAnswer(q, lang) {
  const s = q.toLowerCase();
  const L = (o) => o[lang] || o.vi;
  const place = CONTENT.places.find((p) => s.includes(p.name.vi.toLowerCase()) || s.includes(p.name.en.toLowerCase()))
    || CONTENT.places.find((p) => /nhà thờ|church/.test(s) && p.id === "nha-tho")
    || CONTENT.places.find((p) => /tu viện|monaster|phanxic|francisc/.test(s) && p.id === "tu-vien-phanxico");
  if (place) return `${L(place.name)}\n\n${L(place.story)}\n\n${L(place.arch)}\n\n💡 ${L(place.tips)}`;
  if (/ăn|món|quán|food|eat|dish|restaurant/.test(s))
    return CONTENT.foods.map((f) => `• ${L(f.name)} (${f.price}): ${L(f.desc)}`).join("\n");
  if (/xoài|mango|trái|fruit|vườn|garden/.test(s))
    return CONTENT.experiences.map((x) => `• ${L(x.name)} — ${L(x.season)} — ${x.price}`).join("\n");
  if (/homestay|ngủ|ở đâu|stay|sleep|hotel/.test(s))
    return CONTENT.homestays.map((h) => `• ${h.name}: ${h.price} — ${L(h.desc)}`).join("\n");
  if (/lịch trình|itinerar|1 ngày|one.day|plan/.test(s))
    return lang === "en"
      ? "• 7:00 Breakfast at Tan My market\n• 8:30 Cu Lao Gieng Church & Franciscan Monastery\n• 10:30 Mango orchard tour\n• 12:00 Lunch: fish hotpot, mango salad\n• 14:00 Rice cracker workshop\n• 16:30 Boat trip & sunset on the Tien River"
      : "• 7:00 Ăn sáng chợ Tấn Mỹ\n• 8:30 Nhà thờ Cù Lao Giêng & Tu viện Phanxicô\n• 10:30 Tham quan vườn xoài\n• 12:00 Ăn trưa: lẩu mắm, gỏi xoài\n• 14:00 Học làm bánh phồng\n• 16:30 Đi xuồng ngắm hoàng hôn sông Tiền";
  return lang === "en"
    ? "I can tell you about the church, monasteries, mango orchards, local food, homestays or a one-day itinerary. What would you like to know?"
    : "Tôi có thể giới thiệu nhà thờ, tu viện, vườn xoài, món ăn, homestay hoặc lịch trình 1 ngày. Bạn muốn biết gì?";
}

// --- helpers ---
function readBody(req, limit = 100_000) {
  return new Promise((resolve, reject) => {
    let size = 0, chunks = [];
    req.on("data", (c) => { size += c.length; if (size > limit) { reject(new Error("too large")); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}
function send(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}
const clean = (v, n = 300) => String(v ?? "").slice(0, n).trim();
const validPhone = (p) => /^[0-9+ ]{8,15}$/.test(p);
const validEmail = (e) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(e);
const newId = (prefix) => prefix + Date.now().toString(36).toUpperCase().slice(-4) + crypto.randomBytes(2).toString("hex").toUpperCase();
const now = () => new Date().toISOString();
const ORDER_STATUS = ["new", "confirmed", "shipping", "done", "cancelled"];
const BOOKING_STATUS = ["new", "confirmed", "done", "cancelled"];
const publicUser = (u) => u && { id: u.id, email: u.email, name: u.name, phone: u.phone || "", address: u.address || "", role: u.role };
const clientIp = (req) => String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();

async function currentUser(req) {
  const m = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || "");
  const t = m && tokens.read(m[1]);
  if (!t) return null;
  const u = await db.get("SELECT * FROM users WHERE id = ?", [t.uid]);
  return u || null;
}

function sendFile(res, name, type, body) {
  res.writeHead(200, {
    "Content-Type": type,
    "Content-Disposition": `attachment; filename="${name}"`,
    "Cache-Control": "no-store",
  });
  res.end(body);
}

// Create or refresh the admin account from ADMIN_EMAIL / ADMIN_PASSWORD.
async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const pw = process.env.ADMIN_PASSWORD || "";
  if (!email || !pw) { console.warn("[auth] ADMIN_EMAIL / ADMIN_PASSWORD not set: no admin account"); return; }
  if (pw.length < 10) { console.warn("[auth] ADMIN_PASSWORD must be at least 10 characters: admin not created"); return; }
  const u = await db.get("SELECT * FROM users WHERE email = ?", [email]);
  if (!u) {
    await db.run("INSERT INTO users (id, email, name, role, pass_hash, created_at) VALUES (?, ?, ?, 'admin', ?, ?)",
      [newId("U"), email, "Quản trị viên", hashPassword(pw), now()]);
    console.log("[auth] admin account created:", email);
  } else if (u.role !== "admin" || !verifyPassword(pw, u.pass_hash)) {
    await db.run("UPDATE users SET role = 'admin', pass_hash = ? WHERE id = ?", [hashPassword(pw), u.id]);
    console.log("[auth] admin account updated:", email);
  }
}

// --- routes ---
async function api(req, res, url) {
  // Public browser config. A Maps JavaScript key is visible to every visitor by design;
  // protect it with HTTP-referrer restrictions in Google Cloud, never with secrecy.
  if (url.pathname === "/api/config" && req.method === "GET") {
    return send(res, 200, {
      mapsKey: process.env.GOOGLE_MAPS_API_KEY || "",
      mapId: process.env.GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID",
    });
  }

  if (url.pathname === "/api/chat" && req.method === "POST") {
    const body = await readBody(req);
    const lang = body.lang === "en" ? "en" : "vi";
    const messages = (Array.isArray(body.messages) ? body.messages : [])
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
      .slice(-12);
    while (messages.length && messages[0].role !== "user") messages.shift();
    if (!messages.length) return send(res, 400, { error: "no message" });
    const userPos = body.userPos && Number.isFinite(body.userPos.lat) ? { lat: body.userPos.lat, lng: body.userPos.lng } : null;
    const last = messages[messages.length - 1].content;
    if (!API_KEY) return send(res, 200, { reply: offlineAnswer(last, lang), offline: true });
    try {
      return send(res, 200, { reply: await callAI(messages, lang, userPos) });
    } catch (e) {
      console.error(e.message);
      return send(res, 200, { reply: offlineAnswer(last, lang), offline: true });
    }
  }

  // ---------- Accounts ----------
  if (url.pathname === "/api/auth/register" && req.method === "POST") {
    if (!authLimit(clientIp(req))) return send(res, 429, { error: "too_many" });
    const b = await readBody(req);
    const email = clean(b.email, 254).toLowerCase();
    const name = clean(b.name, 80), phone = clean(b.phone, 20), pw = String(b.password || "");
    if (!name || !validEmail(email)) return send(res, 400, { error: "invalid" });
    if (phone && !validPhone(phone)) return send(res, 400, { error: "phone" });
    if (pw.length < 8 || pw.length > 200) return send(res, 400, { error: "password" });
    if (await db.get("SELECT id FROM users WHERE email = ?", [email])) return send(res, 409, { error: "exists" });
    const u = { id: newId("U"), email, name, phone, role: "customer" };
    await db.run("INSERT INTO users (id, email, name, phone, role, pass_hash, created_at) VALUES (?, ?, ?, ?, 'customer', ?, ?)",
      [u.id, email, name, phone, hashPassword(pw), now()]);
    return send(res, 200, { token: tokens.issue(u), user: publicUser(u) });
  }

  if (url.pathname === "/api/auth/login" && req.method === "POST") {
    if (!authLimit(clientIp(req))) return send(res, 429, { error: "too_many" });
    const b = await readBody(req);
    const u = await db.get("SELECT * FROM users WHERE email = ?", [clean(b.email, 254).toLowerCase()]);
    if (!u || !verifyPassword(String(b.password || ""), u.pass_hash)) return send(res, 401, { error: "wrong" });
    return send(res, 200, { token: tokens.issue(u), user: publicUser(u) });
  }

  if (url.pathname === "/api/me") {
    const u = await currentUser(req);
    if (!u) return send(res, 401, { error: "auth" });
    if (req.method === "PUT") {
      const b = await readBody(req);
      const name = clean(b.name, 80) || u.name, phone = clean(b.phone, 20), address = clean(b.address, 300);
      if (phone && !validPhone(phone)) return send(res, 400, { error: "phone" });
      await db.run("UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?", [name, phone, address, u.id]);
      return send(res, 200, { user: publicUser({ ...u, name, phone, address }) });
    }
    const orders = await db.all("SELECT id, items, total, status, payment, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 50", [u.id]);
    const bookings = await db.all("SELECT id, target_name, date, people, status, created_at FROM bookings WHERE user_id = ? ORDER BY created_at DESC LIMIT 50", [u.id]);
    return send(res, 200, { user: publicUser(u), orders: orders.map((o) => ({ ...o, items: JSON.parse(o.items) })), bookings });
  }

  // ---------- Bookings and orders (guests allowed; linked to the account when signed in) ----------
  if (url.pathname === "/api/contact" && req.method === "POST") {
    const b = await readBody(req);
    const u = await currentUser(req);
    const rec = {
      id: newId("BK"), user_id: u ? u.id : null,
      target: clean(b.target, 40), target_name: clean(b.targetName, 120),
      name: clean(b.name, 80), phone: clean(b.phone, 20), email: clean(b.email || (u && u.email), 254),
      date: clean(b.date, 20), people: Math.max(1, Math.min(100, parseInt(b.people, 10) || 1)), note: clean(b.note, 500),
      status: "new", created_at: now(),
    };
    if (!rec.name || !validPhone(rec.phone)) return send(res, 400, { error: "invalid" });
    await db.run(`INSERT INTO bookings (id, user_id, target, target_name, name, phone, email, date, people, note, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [rec.id, rec.user_id, rec.target, rec.target_name, rec.name, rec.phone, rec.email, rec.date, rec.people, rec.note, rec.status, rec.created_at]);
    pushToSheet("booking", rec);
    return send(res, 200, { ok: true, id: rec.id });
  }

  if (url.pathname === "/api/order" && req.method === "POST") {
    const b = await readBody(req);
    const u = await currentUser(req);
    const items = (Array.isArray(b.items) ? b.items : [])
      .map((i) => ({ p: CONTENT.products.find((p) => p.id === i.id), qty: Math.max(1, Math.min(999, parseInt(i.qty, 10) || 1)) }))
      .filter((i) => i.p)
      .map((i) => ({ id: i.p.id, name: i.p.name.vi, seller: i.p.seller, price: i.p.price, qty: i.qty }));
    const rec = {
      id: newId("DH"), user_id: u ? u.id : null,
      name: clean(b.name, 80), phone: clean(b.phone, 20), email: clean(b.email || (u && u.email), 254),
      address: clean(b.address, 300), note: clean(b.note, 500),
      payment: b.payment === "bank" ? "bank" : "cod",
      items: JSON.stringify(items), total: items.reduce((s, i) => s + i.price * i.qty, 0),
      status: "new", created_at: now(),
    };
    if (!rec.name || !validPhone(rec.phone) || !items.length) return send(res, 400, { error: "invalid" });
    if (rec.email && !validEmail(rec.email)) return send(res, 400, { error: "email" });
    await db.run(`INSERT INTO orders (id, user_id, name, phone, email, address, note, payment, items, total, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [rec.id, rec.user_id, rec.name, rec.phone, rec.email, rec.address, rec.note, rec.payment, rec.items, rec.total, rec.status, rec.created_at]);
    // Remember delivery details on the account for next time.
    if (u && (!u.phone || !u.address)) await db.run("UPDATE users SET phone = ?, address = ? WHERE id = ?", [u.phone || rec.phone, u.address || rec.address, u.id]);
    pushToSheet("order", rec);
    return send(res, 200, { ok: true, id: rec.id, total: rec.total });
  }

  // ---------- Admin ----------
  if (url.pathname.startsWith("/api/admin/")) {
    const u = await currentUser(req);
    if (!u) return send(res, 401, { error: "auth" });
    if (u.role !== "admin") return send(res, 403, { error: "forbidden" });
    const sub = url.pathname.slice("/api/admin/".length);

    if (sub === "summary" && req.method === "GET") {
      const one = async (sql) => Number(Object.values((await db.get(sql)) || { n: 0 })[0]) || 0;
      return send(res, 200, {
        db: db.kind, persistent: db.persistent,
        sheets: !!process.env.SHEETS_WEBHOOK_URL, sheetUrl: process.env.GOOGLE_SHEET_URL || "",
        orders: await one("SELECT COUNT(*) AS n FROM orders"),
        newOrders: await one("SELECT COUNT(*) AS n FROM orders WHERE status = 'new'"),
        revenue: await one("SELECT COALESCE(SUM(total), 0) AS n FROM orders WHERE status <> 'cancelled'"),
        bookings: await one("SELECT COUNT(*) AS n FROM bookings"),
        newBookings: await one("SELECT COUNT(*) AS n FROM bookings WHERE status = 'new'"),
        customers: await one("SELECT COUNT(*) AS n FROM users WHERE role = 'customer'"),
      });
    }
    if (sub === "orders" && req.method === "GET") {
      const st = url.searchParams.get("status");
      const rows = ORDER_STATUS.includes(st)
        ? await db.all("SELECT * FROM orders WHERE status = ? ORDER BY created_at DESC LIMIT 500", [st])
        : await db.all("SELECT * FROM orders ORDER BY created_at DESC LIMIT 500");
      return send(res, 200, { orders: rows.map((o) => ({ ...o, items: JSON.parse(o.items) })) });
    }
    if (sub === "bookings" && req.method === "GET") {
      return send(res, 200, { bookings: await db.all("SELECT * FROM bookings ORDER BY created_at DESC LIMIT 500") });
    }
    if (sub === "customers" && req.method === "GET") {
      return send(res, 200, { customers: await db.all("SELECT id, email, name, phone, address, created_at FROM users WHERE role = 'customer' ORDER BY created_at DESC LIMIT 1000") });
    }
    let m;
    if ((m = /^(orders|bookings)\/([A-Z0-9]{4,20})$/.exec(sub)) && req.method === "PATCH") {
      const b = await readBody(req);
      const allowed = m[1] === "orders" ? ORDER_STATUS : BOOKING_STATUS;
      if (!allowed.includes(b.status)) return send(res, 400, { error: "status" });
      const r = await db.run(`UPDATE ${m[1]} SET status = ?, updated_at = ? WHERE id = ?`, [b.status, now(), m[2]]);
      return send(res, r.changes ? 200 : 404, { ok: !!r.changes });
    }
    if (sub === "export/orders.csv") return sendFile(res, "don-hang.csv", "text/csv; charset=utf-8", csv(ORDER_COLUMNS, await db.all("SELECT * FROM orders ORDER BY created_at DESC")));
    if (sub === "export/bookings.csv") return sendFile(res, "dat-lich.csv", "text/csv; charset=utf-8", csv(BOOKING_COLUMNS, await db.all("SELECT * FROM bookings ORDER BY created_at DESC")));
    if (sub === "export/customers.csv") return sendFile(res, "khach-hang.csv", "text/csv; charset=utf-8",
      csv([{ label: "Email", key: "email" }, { label: "Họ tên", key: "name" }, { label: "Điện thoại", key: "phone" }, { label: "Địa chỉ", key: "address" }, { label: "Ngày đăng ký", key: "created_at" }],
        await db.all("SELECT email, name, phone, address, created_at FROM users WHERE role = 'customer' ORDER BY created_at DESC")));
    if (sub === "export/data.sql") return sendFile(res, "cu-lao-gieng.sql", "application/sql; charset=utf-8", sqlDump({
      orders: await db.all("SELECT * FROM orders ORDER BY created_at"),
      bookings: await db.all("SELECT * FROM bookings ORDER BY created_at"),
    }));
    return send(res, 404, { error: "not found" });
  }

  send(res, 404, { error: "not found" });
}

function serveStatic(req, res, url) {
  let p = decodeURIComponent(url.pathname);
  if (p === "/") p = "/index.html";
  const file = path.normalize(path.join(PUBLIC, p));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(buf);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname === "/health") return send(res, 200, { ok: true, uptime: Math.round(process.uptime()) });
    // CORS: the Android app (Capacitor, origin https://localhost) calls the API and content.json cross-origin
    if (url.pathname.startsWith("/api/") || url.pathname === "/data/content.json") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
      if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
    }
    if (url.pathname.startsWith("/api/")) return await api(req, res, url);
    serveStatic(req, res, url);
  } catch (e) {
    console.error(e);
    send(res, 500, { error: "server error" });
  }
});

openDb(STORE)
  .then(async (d) => {
    db = d;
    await ensureAdmin();
    server.listen(PORT, () => {
      console.log(`Cù Lao Giêng site: http://localhost:${PORT}  (AI: ${API_KEY ? MODEL : "offline mode — set GROQ_API_KEY in .env"}, DB: ${db.kind}${db.persistent ? "" : " — NOT persistent, set DATABASE_URL"})`);
      startKeepAlive();
    });
  })
  .catch((e) => { console.error("Database init failed:", e); process.exit(1); });

// Keep-alive: Render free web services sleep after 15 min without inbound traffic.
// Ping our own public URL every KEEP_ALIVE_MINUTES (default 10) so it stays awake.
// Render sets RENDER_EXTERNAL_URL automatically; set KEEP_ALIVE_URL to override, KEEP_ALIVE=off to disable.
function startKeepAlive() {
  const base = process.env.KEEP_ALIVE_URL || process.env.RENDER_EXTERNAL_URL;
  if (!base || process.env.KEEP_ALIVE === "off") return;
  const minutes = Math.max(1, Number(process.env.KEEP_ALIVE_MINUTES) || 10);
  const target = base.replace(/\/$/, "") + "/health";
  const ping = async () => {
    try {
      const r = await fetch(target, { headers: { "User-Agent": "keep-alive" } });
      console.log(`[keep-alive] ${new Date().toISOString()} ${target} -> ${r.status}`);
    } catch (e) {
      console.log(`[keep-alive] ${new Date().toISOString()} ${target} failed: ${e.message}`);
    }
  };
  console.log(`[keep-alive] pinging ${target} every ${minutes} min`);
  setInterval(ping, minutes * 60 * 1000);
}
