// Accounts: sign in / register, customer account page, admin panel.
// Loaded before app.js. app.js provides helpers through window.CLG at boot.
(function () {
  "use strict";
  const KEY = "clg_auth";
  let state = JSON.parse(localStorage.getItem(KEY) || "null"); // { token, user }

  const Auth = {
    token: () => (state && state.token) || "",
    user: () => (state && state.user) || null,
    isAdmin: () => !!(state && state.user && state.user.role === "admin"),
    headers(extra = {}) { return state ? { ...extra, Authorization: "Bearer " + state.token } : { ...extra }; },
    set(next) {
      state = next;
      next ? localStorage.setItem(KEY, JSON.stringify(next)) : localStorage.removeItem(KEY);
      document.dispatchEvent(new CustomEvent("auth-change"));
    },
  };
  window.Auth = Auth;

  const C = () => window.CLG;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  async function api(path, opts = {}) {
    const r = await fetch(C().API + path, { ...opts, headers: Auth.headers(opts.body ? { "Content-Type": "application/json" } : {}) });
    if (r.status === 401 && Auth.user()) { Auth.set(null); C().toast(C().t("acc.expired")); }
    let j = {};
    try { j = await r.json(); } catch {}
    if (!r.ok) { const e = new Error(j.error || "http " + r.status); e.code = j.error; e.status = r.status; throw e; }
    return j;
  }

  // ---------- Sign in / register dialog ----------
  function openAuth(mode = "login") {
    const { t, esc, openModal } = C();
    openModal(`
      <h2>${t(mode === "login" ? "acc.loginTitle" : "acc.registerTitle")}</h2>
      <div class="seg" role="tablist">
        <button type="button" class="${mode === "login" ? "on" : ""}" data-auth-mode="login">${t("acc.login")}</button>
        <button type="button" class="${mode === "register" ? "on" : ""}" data-auth-mode="register">${t("acc.register")}</button>
      </div>
      <form class="form" id="authForm" novalidate>
        ${mode === "register" ? `<input name="name" required autocomplete="name" placeholder="${esc(t("form.name"))}" />
          <input name="phone" inputmode="tel" autocomplete="tel" pattern="[0-9+ ]{8,15}" placeholder="${esc(t("form.phone"))}" />` : ""}
        <input name="email" type="email" required autocomplete="email" placeholder="Email" />
        <input name="password" type="password" required minlength="8" autocomplete="${mode === "login" ? "current-password" : "new-password"}" placeholder="${esc(t("acc.password"))}" />
        <p class="form-err" id="authErr" role="alert"></p>
        <button class="btn primary full" type="submit">${t(mode === "login" ? "acc.login" : "acc.register")}</button>
      </form>
      <p class="muted small" style="margin-top:.8rem">${t("acc.why")}</p>`);
    $("#authForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target, btn = f.querySelector("[type=submit]");
      const body = Object.fromEntries(new FormData(f));
      const err = $("#authErr");
      err.textContent = "";
      if (!f.checkValidity()) { err.textContent = t("acc.errForm"); return; }
      btn.disabled = true;
      try {
        const j = await api(mode === "login" ? "/api/auth/login" : "/api/auth/register", { method: "POST", body: JSON.stringify(body) });
        Auth.set(j);
        C().closeModal();
        C().toast(t("acc.hello") + " " + j.user.name);
        C().route(j.user.role === "admin" ? "admin" : "account");
      } catch (x) {
        err.textContent = t({ wrong: "acc.errWrong", exists: "acc.errExists", password: "acc.errPw", phone: "acc.errPhone", too_many: "acc.errMany" }[x.code] || "acc.errForm");
        btn.disabled = false;
      }
    });
  }

  // ---------- Status labels ----------
  const STATUS = ["new", "confirmed", "shipping", "done", "cancelled"];
  const BSTATUS = ["new", "confirmed", "done", "cancelled"];
  const badge = (s) => `<span class="st st-${s}">${C().t("st." + s)}</span>`;
  const when = (iso) => new Date(iso).toLocaleString(C().getLang() === "vi" ? "vi-VN" : "en-GB", { dateStyle: "short", timeStyle: "short" });

  // ---------- Customer account ----------
  async function renderAccount() {
    const { t, esc, money } = C();
    const root = $("#accountBody");
    if (!Auth.user()) {
      root.innerHTML = `<div class="tile empty-state"><p>${t("acc.signedOut")}</p>
        <div class="actions"><button class="btn primary" type="button" data-auth-open="login">${t("acc.login")}</button>
        <button class="btn ghost" type="button" data-auth-open="register">${t("acc.register")}</button></div></div>`;
      return;
    }
    root.innerHTML = `<p class="muted">${t("acc.loading")}</p>`;
    let d;
    try { d = await api("/api/me"); } catch { root.innerHTML = `<p class="form-err">${t("err")}</p>`; return; }
    Auth.set({ token: Auth.token(), user: d.user });
    const u = d.user;
    root.innerHTML = `
      <div class="acc-grid">
        <section class="tile">
          <h2>${t("acc.profile")}</h2>
          <p class="muted small">${esc(u.email)}${u.role === "admin" ? " · " + t("acc.admin") : ""}</p>
          <form class="form" id="profileForm" style="margin-top:.8rem">
            <label class="small">${t("form.name")}<input name="name" value="${esc(u.name)}" required autocomplete="name" /></label>
            <label class="small">${t("form.phone")}<input name="phone" value="${esc(u.phone)}" inputmode="tel" pattern="[0-9+ ]{8,15}" autocomplete="tel" /></label>
            <label class="small">${t("acc.address")}<input name="address" value="${esc(u.address)}" autocomplete="street-address" /></label>
            <div class="actions"><button class="btn primary" type="submit">${t("acc.save")}</button>
              <button class="btn ghost" type="button" data-logout>${t("acc.logout")}</button>
              ${u.role === "admin" ? `<a class="btn ghost" href="#admin">${t("acc.adminPanel")}</a>` : ""}</div>
          </form>
        </section>
        <section class="tile">
          <h2>${t("acc.myOrders")}</h2>
          ${d.orders.length ? `<ul class="hist">${d.orders.map((o) => `<li>
              <div><b>${esc(o.id)}</b> ${badge(o.status)}<br><span class="muted small">${when(o.created_at)} · ${o.items.map((i) => esc(i.name) + " ×" + i.qty).join(", ")}</span></div>
              <span class="price">${money(o.total)}</span></li>`).join("")}</ul>` : `<p class="muted">${t("acc.noOrders")}</p>`}
          <h2 style="margin-top:1.4rem">${t("acc.myBookings")}</h2>
          ${d.bookings.length ? `<ul class="hist">${d.bookings.map((b) => `<li>
              <div><b>${esc(b.target_name)}</b> ${badge(b.status)}<br><span class="muted small">${esc(b.date)} · ${b.people} ${t("acc.people")}</span></div>
              <span class="muted small">${esc(b.id)}</span></li>`).join("")}</ul>` : `<p class="muted">${t("acc.noBookings")}</p>`}
        </section>
      </div>`;
    $("#profileForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!e.target.checkValidity()) return C().toast(t("acc.errForm"));
      try {
        const j = await api("/api/me", { method: "PUT", body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
        Auth.set({ token: Auth.token(), user: j.user });
        C().toast(t("acc.saved"));
      } catch { C().toast(t("err")); }
    });
  }

  // ---------- Admin panel ----------
  let adminTab = "orders", orderFilter = "";
  async function renderAdmin() {
    const { t, esc, money } = C();
    const root = $("#adminBody");
    if (!Auth.isAdmin()) { root.innerHTML = `<div class="tile empty-state"><p>${t("adm.only")}</p></div>`; return; }
    root.innerHTML = `<p class="muted">${t("acc.loading")}</p>`;
    let s;
    try { s = await api("/api/admin/summary"); } catch { root.innerHTML = `<p class="form-err">${t("err")}</p>`; return; }
    root.innerHTML = `
      ${s.persistent ? "" : `<div class="notice">${t("adm.notPersistent")}</div>`}
      <div class="stats">
        <div class="tile stat"><span class="muted small">${t("adm.orders")}</span><b>${s.orders}</b><span class="small">${s.newOrders} ${t("adm.new")}</span></div>
        <div class="tile stat"><span class="muted small">${t("adm.revenue")}</span><b>${money(s.revenue)}</b><span class="small muted">${t("adm.notCancelled")}</span></div>
        <div class="tile stat"><span class="muted small">${t("adm.bookings")}</span><b>${s.bookings}</b><span class="small">${s.newBookings} ${t("adm.new")}</span></div>
        <div class="tile stat"><span class="muted small">${t("adm.customers")}</span><b>${s.customers}</b><span class="small muted">${t("adm.db")}: ${esc(s.db)}</span></div>
      </div>
      <div class="tile exports">
        <h2>${t("adm.export")}</h2>
        <div class="actions">
          <button class="btn primary small" type="button" data-export="orders.csv">${icon("bag")}${t("adm.xOrders")}</button>
          <button class="btn ghost small" type="button" data-export="bookings.csv">${icon("calendar")}${t("adm.xBookings")}</button>
          <button class="btn ghost small" type="button" data-export="customers.csv">${icon("user")}${t("adm.xCustomers")}</button>
          <button class="btn ghost small" type="button" data-export="data.sql">${icon("jar")}${t("adm.xSql")}</button>
          ${s.sheetUrl ? `<a class="btn ghost small" href="${esc(s.sheetUrl)}" target="_blank" rel="noopener">${icon("external")}${t("adm.sheet")}</a>` : ""}
        </div>
        <p class="muted small">${s.sheets ? t("adm.sheetsOn") : t("adm.sheetsOff")}</p>
      </div>
      <div class="seg adm-tabs">
        <button type="button" data-adm-tab="orders" class="${adminTab === "orders" ? "on" : ""}">${t("adm.orders")}</button>
        <button type="button" data-adm-tab="bookings" class="${adminTab === "bookings" ? "on" : ""}">${t("adm.bookings")}</button>
        <button type="button" data-adm-tab="customers" class="${adminTab === "customers" ? "on" : ""}">${t("adm.customers")}</button>
      </div>
      <div id="admTable" class="tile table-wrap"></div>`;
    renderAdminTable();
  }

  async function renderAdminTable() {
    const { t, esc, money } = C();
    const box = $("#admTable");
    if (!box) return;
    box.innerHTML = `<p class="muted">${t("acc.loading")}</p>`;
    try {
      if (adminTab === "orders") {
        const { orders } = await api("/api/admin/orders" + (orderFilter ? "?status=" + orderFilter : ""));
        box.innerHTML = `
          <div class="table-tools"><label class="small">${t("adm.filter")}
            <select id="orderFilter"><option value="">${t("adm.all")}</option>${STATUS.map((s) => `<option value="${s}" ${s === orderFilter ? "selected" : ""}>${t("st." + s)}</option>`).join("")}</select></label></div>
          ${orders.length ? `<table class="tbl"><thead><tr><th>${t("adm.code")}</th><th>${t("adm.time")}</th><th>${t("adm.customer")}</th><th>${t("adm.items")}</th><th class="num">${t("cart.total")}</th><th>${t("adm.status")}</th></tr></thead><tbody>
            ${orders.map((o) => `<tr>
              <td><b>${esc(o.id)}</b><br><span class="muted small">${o.payment === "bank" ? t("pay.bank") : t("pay.cod")}</span></td>
              <td class="small">${when(o.created_at)}</td>
              <td>${esc(o.name)}<br><a class="small" href="tel:${esc(o.phone)}">${esc(o.phone)}</a>${o.email ? `<br><span class="muted small">${esc(o.email)}</span>` : ""}${o.address ? `<br><span class="muted small">${esc(o.address)}</span>` : ""}${o.note ? `<br><span class="small">${t("form.note")}: ${esc(o.note)}</span>` : ""}</td>
              <td class="small items">${o.items.map((i) => esc(i.name) + " ×" + i.qty).join("<br>")}</td>
              <td class="num price">${money(o.total)}</td>
              <td><select data-status="orders/${esc(o.id)}" aria-label="${t("adm.status")}">${STATUS.map((s) => `<option value="${s}" ${s === o.status ? "selected" : ""}>${t("st." + s)}</option>`).join("")}</select></td>
            </tr>`).join("")}</tbody></table>` : `<p class="muted">${t("adm.empty")}</p>`}`;
      } else if (adminTab === "bookings") {
        const { bookings } = await api("/api/admin/bookings");
        box.innerHTML = bookings.length ? `<table class="tbl"><thead><tr><th>${t("adm.code")}</th><th>${t("adm.service")}</th><th>${t("book.date")}</th><th class="num">${t("book.people")}</th><th>${t("adm.customer")}</th><th>${t("adm.status")}</th></tr></thead><tbody>
          ${bookings.map((b) => `<tr>
            <td><b>${esc(b.id)}</b><br><span class="muted small">${when(b.created_at)}</span></td>
            <td>${esc(b.target_name)}</td><td>${esc(b.date)}</td><td class="num">${b.people}</td>
            <td>${esc(b.name)}<br><a class="small" href="tel:${esc(b.phone)}">${esc(b.phone)}</a>${b.note ? `<br><span class="small">${esc(b.note)}</span>` : ""}</td>
            <td><select data-status="bookings/${esc(b.id)}" aria-label="${t("adm.status")}">${BSTATUS.map((s) => `<option value="${s}" ${s === b.status ? "selected" : ""}>${t("st." + s)}</option>`).join("")}</select></td>
          </tr>`).join("")}</tbody></table>` : `<p class="muted">${t("adm.empty")}</p>`;
      } else {
        const { customers } = await api("/api/admin/customers");
        box.innerHTML = customers.length ? `<table class="tbl"><thead><tr><th>${t("form.name")}</th><th>Email</th><th>${t("form.phone")}</th><th>${t("acc.address")}</th><th>${t("adm.joined")}</th></tr></thead><tbody>
          ${customers.map((c) => `<tr><td>${esc(c.name)}</td><td>${esc(c.email)}</td><td>${esc(c.phone)}</td><td class="small">${esc(c.address)}</td><td class="small">${when(c.created_at)}</td></tr>`).join("")}</tbody></table>`
          : `<p class="muted">${t("adm.empty")}</p>`;
      }
    } catch { box.innerHTML = `<p class="form-err">${t("err")}</p>`; }
  }

  async function download(file) {
    try {
      const r = await fetch(C().API + "/api/admin/export/" + file, { headers: Auth.headers() });
      if (!r.ok) throw new Error();
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = file.replace("orders", "don-hang").replace("bookings", "dat-lich").replace("customers", "khach-hang").replace("data.sql", "cu-lao-gieng.sql");
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    } catch { C().toast(C().t("err")); }
  }

  // ---------- Events ----------
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-auth-mode],[data-auth-open],[data-logout],[data-export],[data-adm-tab]");
    if (!el) return;
    const d = el.dataset;
    if (d.authMode) openAuth(d.authMode);
    else if (d.authOpen) openAuth(d.authOpen);
    else if ("logout" in d) { Auth.set(null); C().toast(C().t("acc.bye")); C().route("home"); }
    else if (d.export) download(d.export);
    else if (d.admTab) { adminTab = d.admTab; $$("[data-adm-tab]").forEach((b) => b.classList.toggle("on", b === el)); renderAdminTable(); }
  });
  document.addEventListener("change", async (e) => {
    if (e.target.id === "orderFilter") { orderFilter = e.target.value; renderAdminTable(); return; }
    const k = e.target.dataset && e.target.dataset.status;
    if (!k) return;
    e.target.disabled = true;
    try { await api("/api/admin/" + k, { method: "PATCH", body: JSON.stringify({ status: e.target.value }) }); C().toast(C().t("adm.updated")); }
    catch { C().toast(C().t("err")); }
    e.target.disabled = false;
  });

  window.AccountUI = {
    openAuth,
    accountButton() { Auth.user() ? C().route(Auth.isAdmin() ? "admin" : "account") : openAuth("login"); },
    render(view) { if (view === "account") renderAccount(); if (view === "admin") renderAdmin(); },
  };
})();
