(() => {
  "use strict";

  // ---------- State ----------
  let lang = localStorage.getItem("lang") || "vi";
  let DATA = null;
  let map, layer, meMarker;
  let userPos = null;
  let currentCat = "all";
  const markers = {}; // id -> marker
  let cart = JSON.parse(localStorage.getItem("cart") || "[]");
  const chatHistory = []; // {role, content}

  const $ = (s, el = document) => el.querySelector(s);
  const t = (k) => (I18N[lang] && I18N[lang][k]) ?? I18N.vi[k] ?? k;
  const L = (obj) => (obj && typeof obj === "object" ? obj[lang] ?? obj.vi : obj);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => n.toLocaleString(lang === "vi" ? "vi-VN" : "en-US") + "đ";

  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.add("hidden"), 2600);
  }

  // ---------- Geo ----------
  function distanceKm(a, b) {
    const R = 6371, rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  const directionsUrl = (p) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;

  // Unify all map points
  function allPoints() {
    const pts = [];
    DATA.places.forEach((p) => pts.push({ ...p, kind: "place", title: L(p.name), sub: L(p.short) }));
    DATA.eateries.forEach((e) => pts.push({ ...e, kind: "eatery", cat: "food", icon: "🍲", title: e.name, sub: L(e.dishes) }));
    DATA.homestays.forEach((h) => pts.push({ ...h, kind: "stay", cat: "stay", title: h.name, sub: L(h.desc) }));
    DATA.experiences.forEach((x) => pts.push({ ...x, kind: "exp", cat: "garden", title: L(x.name), sub: x.host }));
    return pts;
  }

  function initMap() {
    const c = DATA.center;
    map = L_.map("leaflet").setView([c.lat, c.lng], c.zoom);
    L_.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    layer = L_.layerGroup().addTo(map);
    renderMarkers();
  }
  const L_ = window.L;

  function renderMarkers() {
    layer.clearLayers();
    allPoints()
      .filter((p) => currentCat === "all" || p.cat === currentCat)
      .forEach((p) => {
        const icon = L_.divIcon({ className: "", html: `<div class="pin">${p.icon || "📍"}</div>`, iconSize: [28, 28], iconAnchor: [14, 28] });
        const m = L_.marker([p.lat, p.lng], { icon }).addTo(layer);
        m.bindPopup(
          `<b>${esc(p.title)}</b><br><small>${esc(p.sub)}</small><br>
           <button class="btn small primary" data-open="${p.kind}:${p.id}" style="margin-top:6px">${t("btn.detail")}</button>`
        );
        markers[`${p.kind}:${p.id}`] = m;
      });
    renderNearby();
  }

  function renderNearby() {
    const origin = userPos || DATA.center;
    const list = allPoints()
      .filter((p) => currentCat === "all" || p.cat === currentCat)
      .map((p) => ({ ...p, d: distanceKm(origin, p) }))
      .sort((a, b) => a.d - b.d);
    $("#nearbyList").innerHTML = list
      .map((p) => `<li data-focus="${p.kind}:${p.id}"><span>${p.icon || "📍"} ${esc(p.title)}</span><span class="dist">${p.d.toFixed(1)} ${t("km")}</span></li>`)
      .join("");
    $("#gpsStatus").textContent = userPos ? t("map.gpsOn") : t("map.gpsOff");
  }

  function locate() {
    if (!navigator.geolocation) return toast(t("map.gpsErr"));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const icon = L_.divIcon({ className: "", html: '<div class="me-pin"></div>', iconSize: [18, 18] });
        if (meMarker) meMarker.setLatLng([userPos.lat, userPos.lng]);
        else meMarker = L_.marker([userPos.lat, userPos.lng], { icon }).addTo(map);
        meMarker.bindPopup(t("map.you"));
        map.setView([userPos.lat, userPos.lng], 14);
        renderNearby();
      },
      () => toast(t("map.gpsErr")),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function focusPoint(key) {
    const m = markers[key];
    if (!m) return;
    document.getElementById("map").scrollIntoView();
    map.setView(m.getLatLng(), 16);
    m.openPopup();
  }

  // ---------- Detail / booking modal ----------
  function openModal(html) {
    $("#modalBody").innerHTML = html;
    $("#modal").classList.remove("hidden");
  }
  function closeModal() { $("#modal").classList.add("hidden"); }

  function contactButtons(o) {
    return `
      ${o.phone ? `<a class="btn small outline" href="tel:${esc(o.phone)}">${t("btn.call")}</a>` : ""}
      ${o.zalo ? `<a class="btn small outline" target="_blank" rel="noopener" href="https://zalo.me/${esc(o.zalo)}">${t("btn.zalo")}</a>` : ""}
      <a class="btn small outline" target="_blank" rel="noopener" href="${directionsUrl(o)}">${t("btn.directions")}</a>`;
  }

  function openDetail(key) {
    const [kind, id] = key.split(":");
    if (kind === "place") {
      const p = DATA.places.find((x) => x.id === id);
      return openModal(`
        <h3>${p.icon} ${esc(L(p.name))}</h3>
        <p class="muted">${esc(L(p.short))}</p>
        <h4>${t("detail.story")}</h4><p>${esc(L(p.story))}</p>
        <h4>${t("detail.arch")}</h4><p>${esc(L(p.arch))}</p>
        <h4>${t("detail.tips")}</h4><p>${esc(L(p.tips))}</p>
        <div class="actions">
          <a class="btn small outline" target="_blank" rel="noopener" href="${directionsUrl(p)}">${t("btn.directions")}</a>
          <button class="btn small primary" data-askai="${esc(L(p.name))}">${t("btn.ask")}</button>
        </div>`);
    }
    if (kind === "eatery") {
      const e = DATA.eateries.find((x) => x.id === id);
      return openModal(`<h3>🍲 ${esc(e.name)}</h3><p>${esc(L(e.dishes))}</p>
        <p class="meta">${t("food.price")}: <span class="price">${esc(e.price)}</span> · ${t("food.hours")}: ${esc(e.hours)}</p>
        <div class="actions">${contactButtons(e)}</div>`);
    }
    const src = kind === "stay" ? DATA.homestays : DATA.experiences;
    const o = src.find((x) => x.id === id);
    openBooking(kind, o);
  }

  function openBooking(kind, o) {
    const title = kind === "stay" ? o.name : L(o.name);
    openModal(`
      <h3>${o.icon || ""} ${esc(title)}</h3>
      <p>${esc(L(o.desc))}</p>
      ${o.host ? `<p class="meta">${t("exp.host")}: ${esc(o.host)}</p>` : ""}
      ${o.season ? `<p class="meta">${t("exp.season")}: ${esc(L(o.season))}</p>` : ""}
      <p class="price">${esc(o.price)}</p>
      <div class="actions">${contactButtons(o)}</div>
      <h4>${t("book.title")}</h4>
      <form class="form" id="bookForm">
        <input type="hidden" name="target" value="${kind}:${o.id}" />
        <input type="hidden" name="targetName" value="${esc(title)}" />
        <input name="name" required placeholder="${t("form.name")}" />
        <input name="phone" required pattern="[0-9+ ]{8,15}" placeholder="${t("form.phone")}" />
        <div class="row2">
          <label class="small">${t("book.date")}<input type="date" name="date" required /></label>
          <label class="small">${t("book.people")}<input type="number" name="people" min="1" value="2" required /></label>
        </div>
        <textarea name="note" rows="2" placeholder="${t("form.note")}"></textarea>
        <button class="btn primary full">${t("book.send")}</button>
      </form>`);
    $("#bookForm").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const body = Object.fromEntries(new FormData(ev.target));
      body.lang = lang;
      try {
        const r = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!r.ok) throw new Error();
        closeModal();
        toast(t("book.ok"));
      } catch { toast(t("err")); }
    });
  }

  // ---------- Content grids ----------
  function renderFood() {
    $("#foodGrid").innerHTML = DATA.foods.map((f) => `
      <article class="card">
        <div class="card-img">${f.icon}</div>
        <div class="card-body">
          <h3>${esc(L(f.name))}</h3>
          <p>${esc(L(f.desc))}</p>
          <p class="meta"><b>${t("food.ingr")}:</b> ${esc(L(f.ingredients))}</p>
          <p class="meta">${t("food.price")}: <span class="price">${esc(f.price)}</span></p>
          <div class="actions"><button class="btn small outline" data-askai="${esc(L(f.name))}">${t("btn.ask")}</button></div>
        </div>
      </article>`).join("");

    $("#eateryGrid").innerHTML = DATA.eateries.map((e) => `
      <article class="card">
        <div class="card-body">
          <h3>🍲 ${esc(e.name)}</h3>
          <p>${esc(L(e.dishes))}</p>
          <p class="meta">${t("food.price")}: <span class="price">${esc(e.price)}</span> · ${esc(e.hours)}</p>
          <div class="actions">${contactButtons(e)}
            <button class="btn small outline" data-focus="eatery:${e.id}">${t("btn.map")}</button></div>
        </div>
      </article>`).join("");
  }

  function renderExp() {
    $("#expGrid").innerHTML = DATA.experiences.map((x) => `
      <article class="card">
        <div class="card-img">${x.icon}</div>
        <div class="card-body">
          <h3>${esc(L(x.name))}</h3>
          <p>${esc(L(x.desc))}</p>
          <p class="meta">${t("exp.host")}: ${esc(x.host)} · ${t("exp.season")}: ${esc(L(x.season))}</p>
          <p class="price">${esc(x.price)}</p>
          <div class="actions">
            <button class="btn small primary" data-book="exp:${x.id}">${t("btn.book")}</button>
            ${contactButtons(x)}
          </div>
        </div>
      </article>`).join("");
  }

  function renderStay() {
    $("#stayGrid").innerHTML = DATA.homestays.map((h) => `
      <article class="card">
        <div class="card-img">${h.icon}</div>
        <div class="card-body">
          <h3>${esc(h.name)}</h3>
          <p>${esc(L(h.desc))}</p>
          <p>${h.amenities.map((a) => `<span class="badge">${esc(a)}</span>`).join("")}</p>
          <p class="price">${esc(h.price)}</p>
          <div class="actions">
            <button class="btn small primary" data-book="stay:${h.id}">${t("btn.book")}</button>
            ${contactButtons(h)}
          </div>
        </div>
      </article>`).join("");
  }

  function renderShop() {
    $("#shopGrid").innerHTML = DATA.products.map((p) => `
      <article class="card">
        <div class="card-img">${p.icon}</div>
        <div class="card-body">
          <h3>${esc(L(p.name))}</h3>
          <p>${esc(L(p.desc))}</p>
          <p class="meta">${t("shop.seller")}: ${esc(p.seller)}</p>
          <p class="price">${money(p.price)} / ${esc(L(p.unit))}</p>
          <div class="actions"><button class="btn small primary" data-add="${p.id}">${t("shop.add")}</button></div>
        </div>
      </article>`).join("");
  }

  function renderStories() {
    $("#storyList").innerHTML = DATA.places.map((p) => `
      <div class="story-item"><span>${p.icon} ${esc(L(p.name))}</span>
        <button class="btn small outline" data-story="${p.id}">${t("guide.tell")}</button></div>`).join("");
  }

  // ---------- Cart ----------
  function saveCart() { localStorage.setItem("cart", JSON.stringify(cart)); renderCart(); }
  function addToCart(id) {
    const item = cart.find((c) => c.id === id);
    if (item) item.qty++; else cart.push({ id, qty: 1 });
    saveCart();
    toast(t("cart.added"));
  }
  function renderCart() {
    const lines = cart.map((c) => ({ ...c, p: DATA?.products.find((p) => p.id === c.id) })).filter((c) => c.p);
    $("#cartCount").textContent = lines.reduce((s, c) => s + c.qty, 0);
    $("#cartItems").innerHTML = lines.length
      ? lines.map((c) => `<li><span>${c.p.icon} ${esc(L(c.p.name))}<br><small class="muted">${money(c.p.price)} / ${esc(L(c.p.unit))}</small></span>
          <span class="qty"><button data-dec="${c.id}">−</button>${c.qty}<button data-inc="${c.id}">+</button></span></li>`).join("")
      : `<li class="muted">${t("cart.empty")}</li>`;
    $("#cartTotal").textContent = money(lines.reduce((s, c) => s + c.qty * c.p.price, 0));
  }

  // ---------- AI chat ----------
  function addMsg(role, text) {
    const div = document.createElement("div");
    div.className = `msg ${role === "user" ? "user" : "bot"}`;
    div.textContent = text;
    $("#chatLog").appendChild(div);
    $("#chatLog").scrollTop = $("#chatLog").scrollHeight;
    return div;
  }

  async function ask(question) {
    if (!question.trim()) return;
    addMsg("user", question);
    chatHistory.push({ role: "user", content: question });
    const pending = addMsg("bot", t("guide.thinking"));
    let answer;
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatHistory.slice(-12), lang, userPos }),
      });
      if (!r.ok) throw new Error();
      const j = await r.json();
      answer = j.reply + (j.offline ? `\n\n${t("guide.offline")}` : "");
    } catch {
      answer = localAnswer(question) + `\n\n${t("guide.offline")}`;
    }
    pending.textContent = answer;
    chatHistory.push({ role: "assistant", content: answer });
  }

  // Client-side fallback when the server isn't reachable
  function localAnswer(q) {
    const s = q.toLowerCase();
    const hit = DATA.places.find((p) => s.includes(p.name.vi.toLowerCase()) || s.includes(p.name.en.toLowerCase()))
      || DATA.places.find((p) => p.id.split("-").some((w) => w.length > 3 && s.includes(w)));
    if (hit) return `${L(hit.name)}\n\n${L(hit.story)}\n\n${L(hit.arch)}`;
    if (/ăn|món|food|eat|dish/.test(s)) return DATA.foods.map((f) => `• ${L(f.name)}: ${L(f.desc)}`).join("\n");
    if (/xoài|mango|trái|fruit|vườn/.test(s)) return DATA.experiences.map((x) => `• ${L(x.name)} — ${L(x.season)} (${x.price})`).join("\n");
    return t("guide.hello");
  }

  function renderSuggest() {
    $("#suggest").innerHTML = t("guide.q").map((q) => `<button class="chip" data-q="${esc(q)}">${esc(q)}</button>`).join("");
  }

  // ---------- i18n ----------
  function applyLang() {
    document.documentElement.lang = lang;
    $("#langBtn").textContent = lang === "vi" ? "EN" : "VI";
    document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
    document.title = lang === "vi" ? "Cù Lao Giêng — Trợ lý du lịch AI" : "Cu Lao Gieng — AI Travel Assistant";
    if (!DATA) return;
    renderMarkers(); renderFood(); renderExp(); renderStay(); renderShop(); renderStories(); renderCart(); renderSuggest();
  }

  // ---------- Events ----------
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-open],[data-focus],[data-book],[data-add],[data-inc],[data-dec],[data-story],[data-askai],[data-q],[data-cat]");
    if (!el) return;
    const d = el.dataset;
    if (d.open) openDetail(d.open);
    else if (d.focus) focusPoint(d.focus);
    else if (d.book) openDetail(d.book);
    else if (d.add) addToCart(d.add);
    else if (d.inc) { cart.find((c) => c.id === d.inc).qty++; saveCart(); }
    else if (d.dec) { const c = cart.find((x) => x.id === d.dec); c.qty--; if (c.qty <= 0) cart = cart.filter((x) => x !== c); saveCart(); }
    else if (d.story) {
      const p = DATA.places.find((x) => x.id === d.story);
      ask(lang === "vi" ? `Hãy kể chuyện lịch sử và giải thích kiến trúc, giá trị văn hóa của ${p.name.vi}.` : `Tell me the history, architecture and cultural value of ${p.name.en}.`);
    } else if (d.askai) {
      closeModal();
      document.getElementById("guide").scrollIntoView();
      ask(lang === "vi" ? `Giới thiệu chi tiết về ${d.askai}` : `Tell me more about ${d.askai}`);
    } else if (d.q) ask(d.q);
    else if (d.cat) {
      currentCat = d.cat;
      document.querySelectorAll("#mapFilters .chip").forEach((c) => c.classList.toggle("active", c === el));
      renderMarkers();
    }
  });

  $("#chatForm").addEventListener("submit", (e) => { e.preventDefault(); const v = $("#chatInput").value; $("#chatInput").value = ""; ask(v); });
  $("#locateBtn").addEventListener("click", locate);
  $("#langBtn").addEventListener("click", () => { lang = lang === "vi" ? "en" : "vi"; localStorage.setItem("lang", lang); applyLang(); });
  $("#menuBtn").addEventListener("click", () => $("#nav").classList.toggle("open"));
  $("#nav").addEventListener("click", () => $("#nav").classList.remove("open"));
  $("#modalClose").addEventListener("click", closeModal);
  $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
  $("#cartBtn").addEventListener("click", () => $("#cart").classList.remove("hidden"));
  $("#cartClose").addEventListener("click", () => $("#cart").classList.add("hidden"));
  document.querySelector('.hero a[href="#map"]').addEventListener("click", locate);

  $("#orderForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!cart.length) return toast(t("cart.empty"));
    const body = { ...Object.fromEntries(new FormData(e.target)), items: cart, lang };
    try {
      const r = await fetch("/api/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error();
      const j = await r.json();
      cart = []; saveCart(); e.target.reset();
      $("#cart").classList.add("hidden");
      toast(t("cart.ok") + j.id);
    } catch { toast(t("err")); }
  });

  // ---------- Boot ----------
  fetch("data/content.json")
    .then((r) => r.json())
    .then((json) => {
      DATA = json;
      initMap();
      applyLang();
      addMsg("bot", t("guide.hello"));
    });
  applyLang();
})();
