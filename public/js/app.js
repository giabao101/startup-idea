(() => {
  "use strict";

  // ---------- State ----------
  let lang = localStorage.getItem("lang") || "vi";
  let DATA = null;
  let map, layer, meMarker;
  let userPos = null;
  let currentCat = "all";
  let currentView = "home";
  const markers = {};
  let cart = JSON.parse(localStorage.getItem("cart") || "[]");
  const chatHistory = [];
  const VIEWS = ["home", "map", "guide", "food", "experience", "stay", "shop"];

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const t = (k) => (I18N[lang] && I18N[lang][k]) ?? I18N.vi[k] ?? k;
  const L = (obj) => (obj && typeof obj === "object" ? obj[lang] ?? obj.vi : obj);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => n.toLocaleString(lang === "vi" ? "vi-VN" : "en-US") + "đ";
  const ic = (id, fallback = "pin") => icon(ICON_FOR[id] || fallback);
  const CAT_COLOR = { history: "#8a4b2a", scenic: "#1f6f7a", garden: "#c2410c", food: "#b8860b", stay: "#2f6b3a" };
  const CAT_ICON = { history: "church", scenic: "sunset", garden: "mango", food: "utensils", stay: "bed" };

  function paintIcons(root = document) {
    $$("[data-ico]", root).forEach((el) => { if (!el.firstChild) el.innerHTML = icon(el.dataset.ico); });
  }

  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove("show"), 2600);
  }

  // ---------- Router ----------
  function route(view, { scroll = true } = {}) {
    if (!VIEWS.includes(view)) view = "home";
    currentView = view;
    $$(".view").forEach((v) => v.classList.toggle("active", v.dataset.view === view));
    $$(".dock a").forEach((a) => a.classList.toggle("active", a.dataset.tab === view));
    if (location.hash !== "#" + view) history.replaceState(null, "", "#" + view);
    moveIndicator();
    if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
    if (view === "map" && DATA) {
      if (!map) initMap();
      setTimeout(() => map.invalidateSize(), 60);
    }
  }

  function moveIndicator() {
    const a = $(".dock a.active"), ind = $("#dockIndicator");
    if (!a) return;
    ind.style.width = a.offsetWidth + "px";
    ind.style.transform = `translateX(${a.offsetLeft}px)`;
  }

  // ---------- Geo ----------
  function distanceKm(a, b) {
    const R = 6371, rad = (d) => (d * Math.PI) / 180;
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  const directionsUrl = (p) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;

  function allPoints() {
    const pts = [];
    DATA.places.forEach((p) => pts.push({ ...p, kind: "place", title: L(p.name), sub: L(p.short) }));
    DATA.eateries.forEach((e) => pts.push({ ...e, kind: "eatery", cat: "food", title: e.name, sub: L(e.dishes) }));
    DATA.homestays.forEach((h) => pts.push({ ...h, kind: "stay", cat: "stay", title: h.name, sub: L(h.desc) }));
    DATA.experiences.forEach((x) => pts.push({ ...x, kind: "exp", cat: "garden", title: L(x.name), sub: x.host }));
    return pts;
  }
  const sortedByDistance = (cat = "all") => {
    const origin = userPos || DATA.center;
    return allPoints()
      .filter((p) => cat === "all" || p.cat === cat)
      .map((p) => ({ ...p, d: distanceKm(origin, p) }))
      .sort((a, b) => a.d - b.d);
  };

  const LF = window.L;
  function initMap() {
    const c = DATA.center;
    map = LF.map("leaflet", { zoomControl: true, scrollWheelZoom: false }).setView([c.lat, c.lng], c.zoom);
    LF.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(map);
    layer = LF.layerGroup().addTo(map);
    renderMarkers();
    if (userPos) placeMe();
  }

  function renderMarkers() {
    if (!map) return;
    layer.clearLayers();
    allPoints()
      .filter((p) => currentCat === "all" || p.cat === currentCat)
      .forEach((p) => {
        const html = `<div class="pin" style="--c:${CAT_COLOR[p.cat]}">${icon(ICON_FOR[p.id] || CAT_ICON[p.cat])}</div>`;
        const m = LF.marker([p.lat, p.lng], { icon: LF.divIcon({ className: "", html, iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -30] }) }).addTo(layer);
        m.bindPopup(`<b>${esc(p.title)}</b><br><span class="muted">${esc(p.sub)}</span><br>
          <button class="btn primary small" data-open="${p.kind}:${p.id}" type="button">${t("btn.detail")}</button>`);
        markers[`${p.kind}:${p.id}`] = m;
      });
  }

  function nearItem(p) {
    return `<li><button type="button" data-focus="${p.kind}:${p.id}">
      <span class="ic" style="color:${CAT_COLOR[p.cat]}">${icon(ICON_FOR[p.id] || CAT_ICON[p.cat])}</span>
      <span class="nm">${esc(p.title)}</span><span class="dist">${p.d.toFixed(1)} ${t("km")}</span></button></li>`;
  }

  function renderNearby() {
    if (!DATA) return;
    $("#nearbyList").innerHTML = sortedByDistance(currentCat).map(nearItem).join("");
    $("#homeNear").innerHTML = sortedByDistance().slice(0, 4).map(nearItem).join("");
    $("#gpsStatus").textContent = userPos ? t("map.gpsOn") : t("map.gpsOff");
  }

  function placeMe() {
    const me = LF.divIcon({ className: "", html: '<div class="me-pin"></div>', iconSize: [18, 18] });
    if (meMarker) meMarker.setLatLng([userPos.lat, userPos.lng]);
    else meMarker = LF.marker([userPos.lat, userPos.lng], { icon: me }).addTo(map);
    meMarker.bindPopup(t("map.you"));
  }

  function locate(btn) {
    if (!navigator.geolocation) return toast(t("map.gpsErr"));
    btn && (btn.disabled = true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        btn && (btn.disabled = false);
        userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (map) { placeMe(); map.setView([userPos.lat, userPos.lng], 14); }
        renderNearby();
      },
      () => { btn && (btn.disabled = false); toast(t("map.gpsErr")); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function focusPoint(key) {
    route("map", { scroll: false });
    $("#leaflet").scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
      const m = markers[key];
      if (!m) return;
      map.setView(m.getLatLng(), 16);
      m.openPopup();
    }, 120);
  }

  // ---------- Modal ----------
  let lastFocus = null;
  function openModal(html) {
    lastFocus = document.activeElement;
    $("#modalBody").innerHTML = html;
    const m = $("#modal");
    m.classList.add("open");
    m.setAttribute("aria-hidden", "false");
    setTimeout(() => $("#modalClose").focus(), 50);
  }
  function closeModal() {
    const m = $("#modal");
    m.classList.remove("open");
    m.setAttribute("aria-hidden", "true");
    lastFocus && lastFocus.focus && lastFocus.focus();
  }

  function contactButtons(o) {
    return `
      ${o.phone ? `<a class="btn ghost small" href="tel:${esc(o.phone)}">${icon("phone")}${t("btn.call")}</a>` : ""}
      ${o.zalo ? `<a class="btn ghost small" target="_blank" rel="noopener" href="https://zalo.me/${esc(o.zalo)}">${icon("chat")}${t("btn.zalo")}</a>` : ""}
      <a class="btn ghost small" target="_blank" rel="noopener" href="${directionsUrl(o)}">${icon("compass")}${t("btn.directions")}</a>`;
  }

  function openDetail(key) {
    const [kind, id] = key.split(":");
    if (kind === "place") {
      const p = DATA.places.find((x) => x.id === id);
      return openModal(`
        <h2><span class="card-ic">${ic(p.id)}</span>${esc(L(p.name))}</h2>
        <p class="muted" style="margin-top:.6rem">${esc(L(p.short))}</p>
        <h4>${t("detail.story")}</h4><p>${esc(L(p.story))}</p>
        <h4>${t("detail.arch")}</h4><p>${esc(L(p.arch))}</p>
        <h4>${t("detail.tips")}</h4><p>${esc(L(p.tips))}</p>
        <div class="actions">
          <a class="btn ghost small" target="_blank" rel="noopener" href="${directionsUrl(p)}">${icon("compass")}${t("btn.directions")}</a>
          <button class="btn primary small" type="button" data-askai="${esc(L(p.name))}">${icon("sparkles")}${t("btn.ask")}</button>
        </div>`);
    }
    if (kind === "eatery") {
      const e = DATA.eateries.find((x) => x.id === id);
      return openModal(`<h2><span class="card-ic">${ic(e.id, "utensils")}</span>${esc(e.name)}</h2>
        <p style="margin-top:.6rem">${esc(L(e.dishes))}</p>
        <p class="meta">${t("food.price")}: <span class="price">${esc(e.price)}</span> · ${t("food.hours")}: ${esc(e.hours)}</p>
        <div class="actions">${contactButtons(e)}</div>`);
    }
    const src = kind === "stay" ? DATA.homestays : DATA.experiences;
    openBooking(kind, src.find((x) => x.id === id));
  }

  function openBooking(kind, o) {
    const title = kind === "stay" ? o.name : L(o.name);
    const today = new Date().toISOString().slice(0, 10);
    openModal(`
      <h2><span class="card-ic">${ic(o.id)}</span>${esc(title)}</h2>
      <p style="margin-top:.6rem">${esc(L(o.desc))}</p>
      ${o.host ? `<p class="meta">${t("exp.host")}: ${esc(o.host)}</p>` : ""}
      ${o.season ? `<p class="meta">${t("exp.season")}: ${esc(L(o.season))}</p>` : ""}
      <p class="price" style="margin-top:.3rem">${esc(o.price)}</p>
      <div class="actions">${contactButtons(o)}</div>
      <h4>${t("book.title")}</h4>
      <form class="form" id="bookForm">
        <input type="hidden" name="target" value="${kind}:${o.id}" />
        <input type="hidden" name="targetName" value="${esc(title)}" />
        <input name="name" required autocomplete="name" placeholder="${t("form.name")}" />
        <input name="phone" required inputmode="tel" autocomplete="tel" pattern="[0-9+ ]{8,15}" placeholder="${t("form.phone")}" />
        <div class="row2">
          <label class="small">${t("book.date")}<input type="date" name="date" min="${today}" required /></label>
          <label class="small">${t("book.people")}<input type="number" name="people" min="1" value="2" required /></label>
        </div>
        <textarea name="note" rows="2" placeholder="${t("form.note")}"></textarea>
        <button class="btn primary full" type="submit">${icon("calendar")}${t("book.send")}</button>
      </form>`);
    $("#bookForm").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const btn = ev.target.querySelector("[type=submit]");
      btn.disabled = true;
      const body = Object.fromEntries(new FormData(ev.target));
      body.lang = lang;
      try {
        const r = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!r.ok) throw new Error();
        closeModal();
        toast(t("book.ok"));
      } catch { toast(t("err")); btn.disabled = false; }
    });
  }

  // ---------- Views ----------
  function greeting() {
    const h = new Date().getHours();
    return t(h < 11 ? "greet.morning" : h < 14 ? "greet.noon" : h < 18 ? "greet.afternoon" : "greet.evening");
  }

  function renderHome() {
    $("#greeting").textContent = greeting();
    const plan = [
      ["7:00", "plan.1", "basket", "place:cho-que"],
      ["8:30", "plan.2", "church", "place:nha-tho"],
      ["10:30", "plan.3", "mango", "exp:x1"],
      ["12:00", "plan.4", "bowl", "eatery:e1"],
      ["14:00", "plan.5", "cracker", "exp:x3"],
      ["16:30", "plan.6", "sunset", "exp:x4"],
    ];
    $("#planList").innerHTML = plan.map(([time, k, ico, key]) => `
      <li><button type="button" data-focus="${key}">
        <span class="dot">${icon(ico)}</span><time>${time}</time><span>${esc(t(k))}</span><span class="go">${icon("arrow")}</span>
      </button></li>`).join("");

    const m = new Date().getMonth() + 1;
    const s = m >= 3 && m <= 5 ? ["mango", "mango", "experience"] : m >= 8 && m <= 11 ? ["flood", "drop", "food"] : ["dry", "sunset", "experience"];
    $("#seasonTile").innerHTML = `
      <div class="season-ico">${icon(s[1])}</div>
      <h3>${t(`season.${s[0]}.t`)}</h3>
      <p class="muted small" style="margin-bottom:.5rem">${t("home.season")}</p>
      <p>${t(`season.${s[0]}.d`)}</p>
      <a class="btn ghost small" href="#${s[2]}">${t(s[2] === "food" ? "nav.food" : "nav.exp")}${icon("arrow")}</a>`;

    $("#homeShop").innerHTML = DATA.products.slice(0, 4).map((p) => `
      <li><span class="ic">${ic(p.id)}</span>
        <span class="meta-col"><b>${esc(L(p.name))}</b><span class="meta price">${money(p.price)} / ${esc(L(p.unit))}</span></span>
        <button class="round-btn" type="button" data-add="${p.id}" aria-label="${t("shop.add")}">${icon("plus")}</button></li>`).join("");
  }

  function renderFood() {
    $("#foodGrid").innerHTML = DATA.foods.map((f) => `
      <article class="tile card">
        <div class="card-top"><span class="card-ic">${ic(f.id)}</span><h3>${esc(L(f.name))}</h3></div>
        <p>${esc(L(f.desc))}</p>
        <p class="meta"><b>${t("food.ingr")}:</b> ${esc(L(f.ingredients))}</p>
        <p class="meta">${t("food.price")}: <span class="price">${esc(f.price)}</span></p>
        <div class="actions"><button class="btn ghost small" type="button" data-askai="${esc(L(f.name))}">${icon("sparkles")}${t("btn.ask")}</button></div>
      </article>`).join("");

    $("#eateryGrid").innerHTML = DATA.eateries.map((e) => `
      <article class="tile card">
        <div class="card-top"><span class="card-ic">${ic(e.id, "utensils")}</span><h3>${esc(e.name)}</h3></div>
        <p>${esc(L(e.dishes))}</p>
        <p class="meta"><span class="price">${esc(e.price)}</span> · ${esc(e.hours)}</p>
        <div class="actions">${contactButtons(e)}
          <button class="btn ghost small" type="button" data-focus="eatery:${e.id}">${icon("map")}${t("btn.map")}</button></div>
      </article>`).join("");
  }

  function renderExp() {
    $("#expGrid").innerHTML = DATA.experiences.map((x) => `
      <article class="tile card">
        <div class="card-top"><span class="card-ic">${ic(x.id)}</span><h3>${esc(L(x.name))}</h3></div>
        <p>${esc(L(x.desc))}</p>
        <p class="meta">${t("exp.host")}: ${esc(x.host)}<br>${t("exp.season")}: ${esc(L(x.season))}</p>
        <p class="price">${esc(x.price)}</p>
        <div class="actions">
          <button class="btn primary small" type="button" data-book="exp:${x.id}">${icon("calendar")}${t("btn.book")}</button>
          ${contactButtons(x)}
        </div>
      </article>`).join("");
  }

  function renderStay() {
    $("#stayGrid").innerHTML = DATA.homestays.map((h) => `
      <article class="tile card">
        <div class="card-top"><span class="card-ic">${ic(h.id, "home")}</span><h3>${esc(h.name)}</h3></div>
        <p>${esc(L(h.desc))}</p>
        <div class="tag-row">${h.amenities.map((a) => `<span class="tag">${esc(t("amen." + a))}</span>`).join("")}</div>
        <p class="price">${esc(h.price)}</p>
        <div class="actions">
          <button class="btn primary small" type="button" data-book="stay:${h.id}">${icon("calendar")}${t("btn.book")}</button>
          ${contactButtons(h)}
        </div>
      </article>`).join("");
  }

  function renderShop() {
    $("#shopGrid").innerHTML = DATA.products.map((p) => `
      <article class="tile card">
        <div class="card-top"><span class="card-ic">${ic(p.id)}</span><h3>${esc(L(p.name))}</h3></div>
        <p>${esc(L(p.desc))}</p>
        <p class="meta">${t("shop.seller")}: ${esc(p.seller)}</p>
        <p class="price">${money(p.price)} / ${esc(L(p.unit))}</p>
        <div class="actions"><button class="btn primary small" type="button" data-add="${p.id}">${icon("cart")}${t("shop.add")}</button></div>
      </article>`).join("");
  }

  function renderStories() {
    $("#storyList").innerHTML = DATA.places.map((p) => `
      <div class="story-item"><span><span class="card-ic" style="width:34px;height:34px;border-radius:11px">${ic(p.id)}</span><b>${esc(L(p.name))}</b></span>
        <button class="btn ghost small" type="button" data-story="${p.id}">${t("guide.tell")}</button></div>`).join("");
  }

  // ---------- Cart ----------
  function saveCart() { localStorage.setItem("cart", JSON.stringify(cart)); renderCart(); }
  function addToCart(id) {
    const item = cart.find((c) => c.id === id);
    if (item) item.qty++; else cart.push({ id, qty: 1 });
    saveCart();
    const c = $("#cartCount");
    c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump");
    toast(t("cart.added"));
  }
  function renderCart() {
    const lines = cart.map((c) => ({ ...c, p: DATA?.products.find((p) => p.id === c.id) })).filter((c) => c.p);
    const n = lines.reduce((s, c) => s + c.qty, 0);
    const cc = $("#cartCount");
    cc.textContent = n;
    cc.toggleAttribute("data-zero", n === 0);
    $("#cartItems").innerHTML = lines.length
      ? lines.map((c) => `<li><span>${esc(L(c.p.name))}<br><small class="muted">${money(c.p.price)} / ${esc(L(c.p.unit))}</small></span>
          <span class="qty"><button class="round-btn" type="button" data-dec="${c.id}" aria-label="−">${icon("minus")}</button>${c.qty}<button class="round-btn" type="button" data-inc="${c.id}" aria-label="+">${icon("plus")}</button></span></li>`).join("")
      : `<li class="muted">${t("cart.empty")}</li>`;
    $("#cartTotal").textContent = money(lines.reduce((s, c) => s + c.qty * c.p.price, 0));
  }
  function openCart(open) {
    $("#cart").classList.toggle("open", open);
    $("#scrim").classList.toggle("open", open);
    $("#cart").setAttribute("aria-hidden", String(!open));
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
    route("guide", { scroll: false });
    addMsg("user", question);
    chatHistory.push({ role: "user", content: question });
    const pending = addMsg("bot", t("guide.thinking"));
    pending.classList.add("typing");
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
    pending.classList.remove("typing");
    pending.textContent = answer;
    $("#chatLog").scrollTop = $("#chatLog").scrollHeight;
    chatHistory.push({ role: "assistant", content: answer });
  }

  function localAnswer(q) {
    const s = q.toLowerCase();
    const hit = DATA.places.find((p) => s.includes(p.name.vi.toLowerCase()) || s.includes(p.name.en.toLowerCase()));
    if (hit) return `${L(hit.name)}\n\n${L(hit.story)}\n\n${L(hit.arch)}`;
    if (/ăn|món|food|eat|dish/.test(s)) return DATA.foods.map((f) => `• ${L(f.name)}: ${L(f.desc)}`).join("\n");
    if (/xoài|mango|trái|fruit|vườn/.test(s)) return DATA.experiences.map((x) => `• ${L(x.name)} — ${L(x.season)} (${x.price})`).join("\n");
    return t("guide.hello");
  }

  function renderSuggest() {
    $("#suggest").innerHTML = t("guide.q").map((q) => `<button class="chip" type="button" data-q="${esc(q)}">${esc(q)}</button>`).join("");
  }

  // ---------- i18n ----------
  function applyLang() {
    document.documentElement.lang = lang;
    $("#langBtn").textContent = lang === "vi" ? "EN" : "VI";
    $$("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
    $$("[data-i18n-ph]").forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
    $$("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
    $$(".dock a").forEach((a) => a.setAttribute("aria-label", a.querySelector(".lbl").textContent));
    document.title = lang === "vi" ? "Cù Lao Giêng — Trợ lý du lịch AI" : "Cu Lao Gieng — AI Travel Assistant";
    if (!DATA) return;
    renderHome(); renderMarkers(); renderNearby(); renderFood(); renderExp(); renderStay(); renderShop(); renderStories(); renderCart(); renderSuggest();
    requestAnimationFrame(moveIndicator);
  }

  // ---------- Ripple on press ----------
  document.addEventListener("pointerdown", (e) => {
    const b = e.target.closest(".btn");
    if (!b || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = b.getBoundingClientRect();
    const s = document.createElement("span");
    s.className = "ripple";
    s.style.left = e.clientX - r.left + "px";
    s.style.top = e.clientY - r.top + "px";
    s.style.setProperty("--rs", Math.ceil(Math.hypot(r.width, r.height) / 6));
    b.appendChild(s);
    setTimeout(() => s.remove(), 650);
  });

  // ---------- Events ----------
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-open],[data-focus],[data-book],[data-add],[data-inc],[data-dec],[data-story],[data-askai],[data-q],[data-cat],[data-go]");
    if (!el) return;
    const d = el.dataset;
    if (d.open) openDetail(d.open);
    else if (d.focus) focusPoint(d.focus);
    else if (d.book) openDetail(d.book);
    else if (d.add) addToCart(d.add);
    else if (d.inc) { cart.find((c) => c.id === d.inc).qty++; saveCart(); }
    else if (d.dec) { const c = cart.find((x) => x.id === d.dec); c.qty--; if (c.qty <= 0) cart = cart.filter((x) => x !== c); saveCart(); }
    else if (d.go) route(d.go);
    else if (d.story) {
      const p = DATA.places.find((x) => x.id === d.story);
      ask(lang === "vi" ? `Hãy kể chuyện lịch sử và giải thích kiến trúc, giá trị văn hóa của ${p.name.vi}.` : `Tell me the history, architecture and cultural value of ${p.name.en}.`);
    } else if (d.askai) {
      closeModal();
      ask(lang === "vi" ? `Giới thiệu chi tiết về ${d.askai}` : `Tell me more about ${d.askai}`);
    } else if (d.q) ask(d.q);
    else if (d.cat) {
      currentCat = d.cat;
      $$("#mapFilters .chip").forEach((c) => c.classList.toggle("active", c === el));
      renderMarkers(); renderNearby();
    }
  });

  window.addEventListener("hashchange", () => { openCart(false); route(location.hash.slice(1) || "home"); });
  window.addEventListener("resize", () => requestAnimationFrame(moveIndicator));
  $("#chatForm").addEventListener("submit", (e) => { e.preventDefault(); const v = $("#chatInput").value; $("#chatInput").value = ""; ask(v); });
  $("#promptPill").addEventListener("click", () => { route("guide"); setTimeout(() => $("#chatInput").focus(), 300); });
  $("#locateBtn").addEventListener("click", (e) => locate(e.currentTarget));
  $("#homeLocate").addEventListener("click", (e) => locate(e.currentTarget));
  $("#langBtn").addEventListener("click", () => { lang = lang === "vi" ? "en" : "vi"; localStorage.setItem("lang", lang); applyLang(); });
  $("#modalClose").addEventListener("click", closeModal);
  $("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
  $("#cartBtn").addEventListener("click", () => openCart(true));
  $("#cartClose").addEventListener("click", () => openCart(false));
  $("#scrim").addEventListener("click", () => openCart(false));
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if ($("#modal").classList.contains("open")) closeModal();
    if ($("#cart").classList.contains("open")) openCart(false);
  });

  $("#orderForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!cart.length) return toast(t("cart.empty"));
    const btn = e.target.querySelector("[type=submit]");
    btn.disabled = true;
    const body = { ...Object.fromEntries(new FormData(e.target)), items: cart, lang };
    try {
      const r = await fetch("/api/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error();
      const j = await r.json();
      cart = []; saveCart(); e.target.reset();
      openCart(false);
      toast(t("cart.ok") + j.id);
    } catch { toast(t("err")); }
    btn.disabled = false;
  });

  // ---------- Boot ----------
  $("#brandIcon").innerHTML = icon("mango");
  paintIcons();
  applyLang();
  route(location.hash.slice(1) || "home", { scroll: false });
  fetch("data/content.json")
    .then((r) => r.json())
    .then((json) => {
      DATA = json;
      applyLang();
      renderNearby();
      if (currentView === "map") route("map", { scroll: false });
      addMsg("bot", t("guide.hello"));
    });
  if (document.fonts) document.fonts.ready.then(moveIndicator);
  if ("ResizeObserver" in window) new ResizeObserver(() => moveIndicator()).observe($("#dock"));
})();
