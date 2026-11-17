// Cù Lao Giêng travel site — zero-dependency Node server (Node 18+).
// Serves /public, proxies the AI guide to the Groq API (OpenAI-compatible), stores bookings/orders as JSON.
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
      ? "• 7:00 Village market breakfast\n• 8:30 Cu Lao Gieng Church & Franciscan Monastery\n• 10:30 Mango orchard tour\n• 12:00 Lunch: fish hotpot, mango salad\n• 14:00 Rice cracker workshop\n• 16:30 Boat trip & sunset on the Tien River"
      : "• 7:00 Ăn sáng chợ quê\n• 8:30 Nhà thờ Cù Lao Giêng & Tu viện Phanxicô\n• 10:30 Tham quan vườn xoài\n• 12:00 Ăn trưa: lẩu mắm, gỏi xoài\n• 14:00 Học làm bánh phồng\n• 16:30 Đi xuồng ngắm hoàng hôn sông Tiền";
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
function append(file, record) {
  const f = path.join(STORE, file);
  const arr = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : [];
  arr.push(record);
  fs.writeFileSync(f, JSON.stringify(arr, null, 2));
}
const clean = (v, n = 300) => String(v ?? "").slice(0, n).trim();
const validPhone = (p) => /^[0-9+ ]{8,15}$/.test(p);

// --- routes ---
async function api(req, res, url) {
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

  if (url.pathname === "/api/contact" && req.method === "POST") {
    const b = await readBody(req);
    const rec = {
      id: "BK" + crypto.randomBytes(3).toString("hex").toUpperCase(),
      at: new Date().toISOString(),
      target: clean(b.target, 40), targetName: clean(b.targetName, 120),
      name: clean(b.name, 80), phone: clean(b.phone, 20), date: clean(b.date, 20),
      people: Math.max(1, Math.min(100, parseInt(b.people, 10) || 1)), note: clean(b.note, 500),
    };
    if (!rec.name || !validPhone(rec.phone)) return send(res, 400, { error: "invalid" });
    append("bookings.json", rec);
    return send(res, 200, { ok: true, id: rec.id });
  }

  if (url.pathname === "/api/order" && req.method === "POST") {
    const b = await readBody(req);
    const items = (Array.isArray(b.items) ? b.items : [])
      .map((i) => ({ p: CONTENT.products.find((p) => p.id === i.id), qty: Math.max(1, Math.min(999, parseInt(i.qty, 10) || 1)) }))
      .filter((i) => i.p)
      .map((i) => ({ id: i.p.id, name: i.p.name.vi, seller: i.p.seller, price: i.p.price, qty: i.qty }));
    const rec = {
      id: "DH" + crypto.randomBytes(3).toString("hex").toUpperCase(),
      at: new Date().toISOString(),
      name: clean(b.name, 80), phone: clean(b.phone, 20), address: clean(b.address, 300), note: clean(b.note, 500),
      items, total: items.reduce((s, i) => s + i.price * i.qty, 0), status: "new",
    };
    if (!rec.name || !validPhone(rec.phone) || !items.length) return send(res, 400, { error: "invalid" });
    append("orders.json", rec);
    return send(res, 200, { ok: true, id: rec.id, total: rec.total });
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

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname === "/health") return send(res, 200, { ok: true, uptime: Math.round(process.uptime()) });
    // CORS: the Android app (Capacitor, origin https://localhost) calls the API and content.json cross-origin
    if (url.pathname.startsWith("/api/") || url.pathname === "/data/content.json") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
    }
    if (url.pathname.startsWith("/api/")) return await api(req, res, url);
    serveStatic(req, res, url);
  } catch (e) {
    console.error(e);
    send(res, 500, { error: "server error" });
  }
}).listen(PORT, () => {
  console.log(`Cù Lao Giêng site: http://localhost:${PORT}  (AI: ${API_KEY ? MODEL : "offline mode — set GROQ_API_KEY in .env"})`);
  startKeepAlive();
});

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
