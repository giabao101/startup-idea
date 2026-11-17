// Passwords (scrypt) and signed bearer tokens (HMAC-SHA256). No external dependencies.
// Tokens travel in the Authorization header so the Android app (a different origin) works too.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const TOKEN_DAYS = 30;

function secret(storeDir) {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32) return process.env.SESSION_SECRET;
  // Fallback: a random secret kept on disk. On Render's free plan it changes on every deploy,
  // which logs everyone out, so set SESSION_SECRET there.
  const f = path.join(storeDir, ".session-secret");
  try { return fs.readFileSync(f, "utf8"); } catch {}
  const s = crypto.randomBytes(48).toString("hex");
  fs.mkdirSync(storeDir, { recursive: true });
  fs.writeFileSync(f, s, { mode: 0o600 });
  console.warn("[auth] SESSION_SECRET not set: using a generated secret in data/.session-secret");
  return s;
}

function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

function verifyPassword(pw, stored) {
  const [alg, s, h] = String(stored).split("$");
  if (alg !== "scrypt" || !s || !h) return false;
  const want = Buffer.from(h, "base64");
  const got = crypto.scryptSync(pw, Buffer.from(s, "base64"), want.length, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(want, got);
}

function makeTokens(storeDir) {
  const key = secret(storeDir);
  const b64 = (buf) => Buffer.from(buf).toString("base64url");
  const sign = (data) => crypto.createHmac("sha256", key).update(data).digest("base64url");
  return {
    issue(user) {
      const body = b64(JSON.stringify({ uid: user.id, role: user.role, exp: Date.now() + TOKEN_DAYS * 864e5 }));
      return `${body}.${sign(body)}`;
    },
    read(token) {
      const [body, sig] = String(token || "").split(".");
      if (!body || !sig) return null;
      const want = Buffer.from(sign(body));
      const got = Buffer.from(sig);
      if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null;
      try {
        const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
        return p.exp > Date.now() ? p : null;
      } catch { return null; }
    },
  };
}

// Small in-memory limiter for login/register attempts per IP.
function rateLimiter(max, windowMs) {
  const hits = new Map();
  return (key) => {
    const now = Date.now();
    const list = (hits.get(key) || []).filter((t) => now - t < windowMs);
    list.push(now);
    hits.set(key, list);
    if (hits.size > 5000) hits.clear();
    return list.length <= max;
  };
}

module.exports = { hashPassword, verifyPassword, makeTokens, rateLimiter };
