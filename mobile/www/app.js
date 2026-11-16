(() => {
  "use strict";

  // API: the deployed Render server. When previewed from a local http server, use the local backend.
  const API = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && location.protocol === "http:"
    ? "http://localhost:3000"
    : "https://cu-lao-gieng.onrender.com";

  const S = {
    vi: {
      tExplore: "Khám phá", tMap: "Bản đồ", tAi: "Trợ lý AI", tStay: "Trải nghiệm", tMarket: "Chợ quê",
      morning: "Chào buổi sáng", noon: "Chào buổi trưa", afternoon: "Chào buổi chiều", evening: "Chào buổi tối",
      hello: "Hôm nay khám phá Cù Lao Giêng nhé?", askBar: "Hỏi trợ lý AI về lịch sử, món ăn, lịch trình…",
      places: "Điểm đến", experiences: "Trải nghiệm cùng người dân", nearby: "Gần bạn", seeAll: "Xem tất cả", locate: "Định vị",
      seasonMango: ["Mùa xoài chín", "Tháng 3–5: xoài cát Hòa Lộc chín cây. Đặt lịch hái xoài cùng chủ vườn."],
      seasonFlood: ["Mùa nước nổi", "Tháng 8–11: bông điên điển, cá linh non. Thử bánh xèo điên điển và lẩu mắm."],
      seasonDry: ["Mùa khô", "Nắng đẹp, hợp đạp xe quanh cù lao và đi xuồng ngắm hoàng hôn."],
      all: "Tất cả", history: "Di tích", scenic: "Thắng cảnh", garden: "Vườn", food: "Quán ăn", stay: "Homestay",
      segExp: "Trải nghiệm", segHome: "Homestay", segShop: "Đặc sản", segFood: "Món ăn", segEat: "Quán ăn",
      hi: "Xin chào! Tôi là trợ lý AI của Cù Lao Giêng. Bạn muốn biết gì?", ph: "Nhập câu hỏi…", offline: "(ngoại tuyến)",
      q: ["Lịch sử nhà thờ Cù Lao Giêng?", "Lịch trình 1 ngày", "Mùa xoài tháng mấy?", "Nên ăn món gì?"],
      story: "Câu chuyện lịch sử", arch: "Kiến trúc & giá trị văn hóa", tips: "Lưu ý", askAi: "Hỏi AI", directions: "Chỉ đường",
      call: "Gọi", zalo: "Zalo", book: "Đặt lịch", host: "Chủ nhà", season: "Mùa", price: "Giá", hours: "Giờ mở cửa", ingr: "Thành phần",
      bookTitle: "Gửi yêu cầu đặt lịch", date: "Ngày dự kiến", people: "Số người", send: "Gửi yêu cầu",
      fName: "Họ tên", fPhone: "Số điện thoại", fAddr: "Địa chỉ giao (bỏ trống nếu nhận tại vườn)", fNote: "Ghi chú",
      bookOk: "Đã gửi! Người dân sẽ gọi lại cho bạn.", err: "Chưa gửi được. Kiểm tra mạng rồi thử lại.",
      cart: "Giỏ hàng", total: "Tổng", order: "Đặt hàng", empty: "Giỏ hàng trống. Ghé Chợ quê để chọn sản phẩm.",
      added: "Đã thêm vào giỏ", orderOk: "Đặt hàng thành công! Mã đơn: ", seller: "Người bán",
      gpsErr: "Không lấy được vị trí. Hãy bật GPS và cho phép quyền vị trí.", you: "Bạn đang ở đây", detail: "Chi tiết",
      amen: { wifi: "Wifi", bike: "Xe đạp", breakfast: "Bữa sáng", boat: "Đi xuồng", meal: "Nấu ăn cùng chủ nhà", garden: "Vườn" },
      exitHint: "Nhấn Quay lại lần nữa để thoát", sub: "Trợ lý du lịch AI", km: "km"
    },
    en: {
      tExplore: "Explore", tMap: "Map", tAi: "AI Guide", tStay: "Experiences", tMarket: "Market",
      morning: "Good morning", noon: "Good afternoon", afternoon: "Good afternoon", evening: "Good evening",
      hello: "Ready to explore Cu Lao Gieng today?", askBar: "Ask the AI about history, food, itineraries…",
      places: "Places", experiences: "Experiences with locals", nearby: "Near you", seeAll: "See all", locate: "Locate",
      seasonMango: ["Mango season", "March–May: tree-ripened Hoa Loc mangoes. Book a picking visit."],
      seasonFlood: ["Flood season", "Aug–Nov: sesbania flowers and young linh fish. Try sesbania pancakes and fish hotpot."],
      seasonDry: ["Dry season", "Sunny days for cycling the island and sunset boat trips."],
      all: "All", history: "Historic", scenic: "Scenic", garden: "Gardens", food: "Eateries", stay: "Homestays",
      segExp: "Experiences", segHome: "Homestays", segShop: "Goods", segFood: "Dishes", segEat: "Eateries",
      hi: "Hello! I'm the AI guide for Cu Lao Gieng. What would you like to know?", ph: "Type your question…", offline: "(offline)",
      q: ["History of the church?", "One-day itinerary", "When is mango season?", "What should I eat?"],
      story: "Historical story", arch: "Architecture & cultural value", tips: "Tips", askAi: "Ask AI", directions: "Directions",
      call: "Call", zalo: "Zalo", book: "Book", host: "Host", season: "Season", price: "Price", hours: "Hours", ingr: "Ingredients",
      bookTitle: "Send a booking request", date: "Planned date", people: "Guests", send: "Send request",
      fName: "Full name", fPhone: "Phone number", fAddr: "Delivery address (blank to pick up)", fNote: "Note",
      bookOk: "Sent! The host will call you back.", err: "Could not send. Check your connection and try again.",
      cart: "Cart", total: "Total", order: "Place order", empty: "Your cart is empty. Visit Market to pick products.",
      added: "Added to cart", orderOk: "Order placed! ID: ", seller: "Seller",
      gpsErr: "Could not get your location. Turn on GPS and allow location access.", you: "You are here", detail: "Details",
      amen: { wifi: "Wi-Fi", bike: "Bicycles", breakfast: "Breakfast", boat: "Boat trips", meal: "Cook with hosts", garden: "Garden" },
      exitHint: "Press back again to exit", sub: "AI travel assistant", km: "km"
    }
  };

  let lang = localStorage.getItem("lang") || "vi";
  let D = null, map, layer, meMarker, userPos = null;
  let tab = "explore", mapCat = "all", staySeg = "exp", marketSeg = "shop";
  let cart = JSON.parse(localStorage.getItem("cart") || "[]");
  const chat = [];
  const markers = {};

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const t = (k) => S[lang][k] ?? S.vi[k] ?? k;
  const L = (o) => (o && typeof o === "object" ? o[lang] ?? o.vi : o);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => n.toLocaleString(lang === "vi" ? "vi-VN" : "en-US") + "đ";
  const COLOR = { history: "#8a4b2a", scenic: "#1f6f7a", garden: "#c2410c", food: "#9a6b00", stay: "#2f6b3a" };
  const CATICO = { history: "church", scenic: "sunset", garden: "mango", food: "utensils", stay: "bed" };
  const ico = (id, cat) => icon(ICON_FOR[id] || CATICO[cat] || "pin");
  const art = (cat) => `background:linear-gradient(135deg, ${COLOR[cat]}, ${COLOR[cat]}cc)`;
  const Cap = window.Capacitor;
  const plugin = (n) => Cap && Cap.Plugins && Cap.Plugins[n];

  function snack(msg) {
    const el = $("#snack");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(snack.t);
    snack.t = setTimeout(() => el.classList.remove("show"), 2600);
  }
  function paint(root = document) { $$("[data-ico]", root).forEach((e) => { if (!e.firstChild) e.innerHTML = icon(e.dataset.ico); }); }

  // ---------- Tabs ----------
  const TITLES = { explore: "tExplore", map: "tMap", ai: "tAi", stay: "tStay", market: "tMarket" };
  function go(next) {
    tab = next;
    $$(".screen").forEach((s) => s.classList.toggle("active", s.dataset.screen === next));
    $$(".tabbar button").forEach((b) => b.classList.toggle("on", b.dataset.tab === next));
    $("#appTitle").textContent = t(TITLES[next]);
    if (next === "map" && D) { if (!map) initMap(); setTimeout(() => map.invalidateSize(), 50); }
  }

  // ---------- Geo ----------
  function dist(a, b) {
    const R = 6371, r = (d) => (d * Math.PI) / 180;
    const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  const dirUrl = (p) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
  function points() {
    return [
      ...D.places.map((p) => ({ ...p, kind: "place", title: L(p.name), sub: L(p.short) })),
      ...D.experiences.map((x) => ({ ...x, kind: "exp", cat: "garden", title: L(x.name), sub: x.host })),
      ...D.eateries.map((e) => ({ ...e, kind: "eat", cat: "food", title: e.name, sub: L(e.dishes) })),
      ...D.homestays.map((h) => ({ ...h, kind: "home", cat: "stay", title: h.name, sub: L(h.desc) })),
    ];
  }
  const near = (cat = "all") => {
    const o = userPos || D.center;
    return points().filter((p) => cat === "all" || p.cat === cat).map((p) => ({ ...p, d: dist(o, p) })).sort((a, b) => a.d - b.d);
  };
  const row = (p) => `<button class="row" type="button" data-open="${p.kind}:${p.id}">
      <span class="av" style="${art(p.cat)}">${ico(p.id, p.cat)}</span>
      <span class="tx"><b>${esc(p.title)}</b><span>${esc(p.sub)}</span></span>
      <span class="km">${p.d.toFixed(1)} ${t("km")}</span></button>`;

  function initMap() {
    const LF = window.L;
    map = LF.map("map", { zoomControl: false, attributionControl: true }).setView([D.center.lat, D.center.lng], D.center.zoom);
    LF.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(map);
    layer = LF.layerGroup().addTo(map);
    drawMarkers();
    if (userPos) placeMe();
  }
  function drawMarkers() {
    if (!map) return;
    const LF = window.L;
    layer.clearLayers();
    near(mapCat).forEach((p) => {
      const html = `<div class="pin" style="background:${COLOR[p.cat]}">${ico(p.id, p.cat)}</div>`;
      const m = LF.marker([p.lat, p.lng], { icon: LF.divIcon({ className: "", html, iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -28] }) }).addTo(layer);
      m.bindPopup(`<b>${esc(p.title)}</b><br><button class="btn primary" type="button" data-open="${p.kind}:${p.id}">${t("detail")}</button>`);
      markers[`${p.kind}:${p.id}`] = m;
    });
  }
  function placeMe() {
    const LF = window.L;
    const i = LF.divIcon({ className: "", html: '<div class="me"></div>', iconSize: [18, 18] });
    if (meMarker) meMarker.setLatLng([userPos.lat, userPos.lng]);
    else meMarker = LF.marker([userPos.lat, userPos.lng], { icon: i }).addTo(map).bindPopup(t("you"));
  }
  async function locate() {
    try {
      const Geo = plugin("Geolocation");
      let c;
      if (Geo) {
        await Geo.requestPermissions().catch(() => {});
        c = (await Geo.getCurrentPosition({ enableHighAccuracy: true, timeout: 12000 })).coords;
      } else {
        c = await new Promise((ok, no) => navigator.geolocation
          ? navigator.geolocation.getCurrentPosition((p) => ok(p.coords), no, { enableHighAccuracy: true, timeout: 12000 })
          : no());
      }
      userPos = { lat: c.latitude, lng: c.longitude };
      if (map) { placeMe(); map.setView([userPos.lat, userPos.lng], 14); }
      renderNear();
    } catch { snack(t("gpsErr")); }
  }

  // ---------- Renders ----------
  function renderExplore() {
    const h = new Date().getHours();
    $("#helloTime").textContent = t(h < 11 ? "morning" : h < 14 ? "noon" : h < 18 ? "afternoon" : "evening") + "!";
    $("#helloTitle").textContent = t("hello");
    $("#askBarText").textContent = t("askBar");
    const m = new Date().getMonth() + 1;
    const [key, ic] = m >= 3 && m <= 5 ? ["seasonMango", "mango"] : m >= 8 && m <= 11 ? ["seasonFlood", "drop"] : ["seasonDry", "sunset"];
    $("#season").innerHTML = `${icon(ic)}<h3>${t(key)[0]}</h3><p>${t(key)[1]}</p>`;
    $("#placeCarousel").innerHTML = D.places.map((p) => `
      <button class="ccard" type="button" data-open="place:${p.id}">
        <div class="art" style="${art(p.cat)}">${ico(p.id, p.cat)}</div>
        <div class="body"><h4>${esc(L(p.name))}</h4><p>${esc(L(p.short))}</p></div></button>`).join("");
    $("#expCarousel").innerHTML = D.experiences.map((x) => `
      <button class="ccard" type="button" data-open="exp:${x.id}">
        <div class="art" style="${art("garden")}">${ico(x.id, "garden")}</div>
        <div class="body"><h4>${esc(L(x.name))}</h4><p>${esc(x.host)} · ${esc(x.price)}</p></div></button>`).join("");
  }
  function renderNear() {
    if (!D) return;
    $("#nearList").innerHTML = near().slice(0, 5).map(row).join("");
    $("#mapList").innerHTML = near(mapCat).map(row).join("");
  }
  function renderChips() {
    const cats = [["all", "pin"], ["history", "church"], ["scenic", "sunset"], ["garden", "mango"], ["food", "utensils"], ["stay", "bed"]];
    $("#mapChips").innerHTML = cats.map(([c, i]) => `<button class="mchip ${c === mapCat ? "on" : ""}" type="button" data-cat="${c}">${icon(i)}${t(c)}</button>`).join("");
  }
  function renderStay() {
    const contact = (o) => `${o.phone ? `<a class="btn tonal" href="tel:${esc(o.phone)}">${icon("phone")}${t("call")}</a>` : ""}`;
    if (staySeg === "exp") {
      $("#stayList").innerHTML = D.experiences.map((x) => `
        <article class="bcard">
          <div class="art" style="${art("garden")}">${ico(x.id, "garden")}</div>
          <div class="body"><h4>${esc(L(x.name))}</h4><p>${esc(L(x.desc))}</p>
            <p>${t("host")}: ${esc(x.host)} · ${t("season")}: ${esc(L(x.season))}</p>
            <span class="price">${esc(x.price)}</span>
            <div class="btn-row"><button class="btn primary grow" type="button" data-open="exp:${x.id}">${icon("calendar")}${t("book")}</button>${contact(x)}</div>
          </div></article>`).join("");
    } else {
      $("#stayList").innerHTML = D.homestays.map((h) => `
        <article class="bcard">
          <div class="art" style="${art("stay")}">${ico(h.id, "stay")}</div>
          <div class="body"><h4>${esc(h.name)}</h4><p>${esc(L(h.desc))}</p>
            <div class="chips-row">${h.amenities.map((a) => `<span class="tag">${esc(t("amen")[a] || a)}</span>`).join("")}</div>
            <span class="price">${esc(h.price)}</span>
            <div class="btn-row"><button class="btn primary grow" type="button" data-open="home:${h.id}">${icon("calendar")}${t("book")}</button>${contact(h)}</div>
          </div></article>`).join("");
    }
  }
  function renderMarket() {
    const b = $("#marketBody");
    if (marketSeg === "shop") {
      b.innerHTML = `<div class="pgrid">${D.products.map((p) => `
        <article class="pcard">
          <div class="art">${ico(p.id)}</div>
          <div class="body"><b>${esc(L(p.name))}</b><span class="who">${esc(p.seller)}</span>
            <div class="foot"><span class="price">${money(p.price)}<small>/${esc(L(p.unit))}</small></span>
              <button class="add" type="button" data-add="${p.id}" aria-label="+">${icon("plus")}</button></div></div>
        </article>`).join("")}</div>`;
    } else if (marketSeg === "food") {
      b.innerHTML = `<div class="list">${D.foods.map((f) => `
        <button class="row" type="button" data-open="food:${f.id}">
          <span class="av" style="background:#fff4df;color:#b86a00">${ico(f.id)}</span>
          <span class="tx"><b>${esc(L(f.name))}</b><span>${esc(f.price)}</span></span>${icon("chevron")}</button>`).join("")}</div>`;
    } else {
      b.innerHTML = `<div class="list">${D.eateries.map((e) => `
        <button class="row" type="button" data-open="eat:${e.id}">
          <span class="av" style="${art("food")}">${ico(e.id, "food")}</span>
          <span class="tx"><b>${esc(e.name)}</b><span>${esc(L(e.dishes))} · ${esc(e.hours)}</span></span>${icon("chevron")}</button>`).join("")}</div>`;
    }
  }
  function renderSuggest() {
    $("#chatSuggest").innerHTML = t("q").map((q) => `<button type="button" data-q="${esc(q)}">${esc(q)}</button>`).join("");
    $("#chatInput").placeholder = t("ph");
  }

  // ---------- Detail page ----------
  function openPage(title, html) {
    $("#pageTitle").textContent = title;
    $("#pageBody").innerHTML = html;
    $("#pageBody").scrollTop = 0;
    $("#page").classList.add("open");
    $("#page").setAttribute("aria-hidden", "false");
  }
  function closePage() { $("#page").classList.remove("open"); $("#page").setAttribute("aria-hidden", "true"); }
  const pageOpen = () => $("#page").classList.contains("open");

  function openItem(key) {
    const [kind, id] = key.split(":");
    if (map) map.closePopup();
    if (kind === "place") {
      const p = D.places.find((x) => x.id === id);
      return openPage(L(p.name), `
        <div class="hero" style="${art(p.cat)}">${ico(p.id, p.cat)}</div>
        <div class="page-inner">
          <h2>${esc(L(p.name))}</h2><p class="sub">${esc(L(p.short))}</p>
          <div class="btn-row"><a class="btn primary grow" href="${dirUrl(p)}" target="_blank" rel="noopener">${icon("compass")}${t("directions")}</a>
            <button class="btn accent grow" type="button" data-ask="${esc(L(p.name))}">${icon("sparkles")}${t("askAi")}</button></div>
          <h4>${t("story")}</h4><p>${esc(L(p.story))}</p>
          <h4>${t("arch")}</h4><p>${esc(L(p.arch))}</p>
          <h4>${t("tips")}</h4><p>${esc(L(p.tips))}</p>
        </div>`);
    }
    if (kind === "food") {
      const f = D.foods.find((x) => x.id === id);
      return openPage(L(f.name), `
        <div class="hero" style="background:linear-gradient(135deg,#f6a723,#e07b00)">${ico(f.id)}</div>
        <div class="page-inner"><h2>${esc(L(f.name))}</h2><p>${esc(L(f.desc))}</p>
          <div class="info"><div><span>${t("ingr")}</span><span>${esc(L(f.ingredients))}</span></div><div><span>${t("price")}</span><span>${esc(f.price)}</span></div></div>
          <button class="btn accent" type="button" data-ask="${esc(L(f.name))}">${icon("sparkles")}${t("askAi")}</button></div>`);
    }
    if (kind === "eat") {
      const e = D.eateries.find((x) => x.id === id);
      return openPage(e.name, `
        <div class="hero" style="${art("food")}">${ico(e.id, "food")}</div>
        <div class="page-inner"><h2>${esc(e.name)}</h2><p>${esc(L(e.dishes))}</p>
          <div class="info"><div><span>${t("price")}</span><span>${esc(e.price)}</span></div><div><span>${t("hours")}</span><span>${esc(e.hours)}</span></div></div>
          <div class="btn-row"><a class="btn primary grow" href="tel:${esc(e.phone)}">${icon("phone")}${t("call")}</a>
            <a class="btn tonal grow" href="${dirUrl(e)}" target="_blank" rel="noopener">${icon("compass")}${t("directions")}</a></div></div>`);
    }
    const isHome = kind === "home";
    const o = (isHome ? D.homestays : D.experiences).find((x) => x.id === id);
    const title = isHome ? o.name : L(o.name);
    const today = new Date().toISOString().slice(0, 10);
    openPage(title, `
      <div class="hero" style="${art(isHome ? "stay" : "garden")}">${ico(o.id, isHome ? "stay" : "garden")}</div>
      <div class="page-inner">
        <h2>${esc(title)}</h2><p>${esc(L(o.desc))}</p>
        <div class="info">
          ${o.host ? `<div><span>${t("host")}</span><span>${esc(o.host)}</span></div>` : ""}
          ${o.season ? `<div><span>${t("season")}</span><span>${esc(L(o.season))}</span></div>` : ""}
          <div><span>${t("price")}</span><span>${esc(o.price)}</span></div>
        </div>
        <div class="btn-row">
          <a class="btn tonal grow" href="tel:${esc(o.phone)}">${icon("phone")}${t("call")}</a>
          <a class="btn tonal grow" href="https://zalo.me/${esc(o.zalo)}" target="_blank" rel="noopener">${icon("chat")}${t("zalo")}</a>
          <a class="btn tonal grow" href="${dirUrl(o)}" target="_blank" rel="noopener">${icon("compass")}${t("directions")}</a>
        </div>
        <h4>${t("bookTitle")}</h4>
        <form class="form" id="bookForm">
          <input type="hidden" name="target" value="${isHome ? "stay" : "exp"}:${o.id}" />
          <input type="hidden" name="targetName" value="${esc(title)}" />
          <input name="name" required autocomplete="name" placeholder="${t("fName")}" />
          <input name="phone" required inputmode="tel" pattern="[0-9+ ]{8,15}" placeholder="${t("fPhone")}" />
          <div class="two"><label>${t("date")}<input type="date" name="date" min="${today}" required /></label>
            <label>${t("people")}<input type="number" name="people" min="1" value="2" required /></label></div>
          <textarea name="note" rows="2" placeholder="${t("fNote")}"></textarea>
          <button class="btn primary" type="submit">${icon("send")}${t("send")}</button>
        </form>
      </div>`);
    $("#bookForm").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const btn = ev.target.querySelector("[type=submit]");
      btn.disabled = true;
      try {
        const r = await fetch(API + "/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(new FormData(ev.target)), lang }) });
        if (!r.ok) throw 0;
        closePage();
        snack(t("bookOk"));
      } catch { snack(t("err")); btn.disabled = false; }
    });
  }

  // ---------- Cart ----------
  function saveCart() { localStorage.setItem("cart", JSON.stringify(cart)); renderCart(); }
  function renderCart() {
    const lines = cart.map((c) => ({ ...c, p: D && D.products.find((p) => p.id === c.id) })).filter((c) => c.p);
    const n = lines.reduce((s, c) => s + c.qty, 0);
    const bd = $("#cartBadge");
    bd.hidden = n === 0;
    bd.textContent = n;
    $("#cartLines").innerHTML = lines.length
      ? lines.map((c) => `<div class="cline"><span class="nm"><b>${esc(L(c.p.name))}</b><span>${money(c.p.price)} / ${esc(L(c.p.unit))}</span></span>
          <span class="stepper"><button type="button" data-dec="${c.id}" aria-label="-">${icon("minus")}</button>${c.qty}<button type="button" data-inc="${c.id}" aria-label="+">${icon("plus")}</button></span></div>`).join("")
      : `<p class="empty">${t("empty")}</p>`;
    $("#cartTotal").textContent = money(lines.reduce((s, c) => s + c.qty * c.p.price, 0));
  }
  function sheet(open) {
    $("#cartSheet").classList.toggle("open", open);
    $("#scrim").classList.toggle("open", open);
    $("#cartSheet").setAttribute("aria-hidden", String(!open));
  }
  const sheetOpen = () => $("#cartSheet").classList.contains("open");

  // ---------- Chat ----------
  function bubble(role, text) {
    const d = document.createElement("div");
    d.className = "bubble " + role;
    d.textContent = text;
    $("#chatLog").appendChild(d);
    $("#chatLog").scrollTop = $("#chatLog").scrollHeight;
    return d;
  }
  async function ask(q) {
    if (!q.trim()) return;
    if (pageOpen()) closePage();
    go("ai");
    bubble("me", q);
    chat.push({ role: "user", content: q });
    const w = bubble("bot wait", "");
    w.innerHTML = '<span class="dots"><i></i><i></i><i></i></span>';
    let a;
    try {
      const r = await fetch(API + "/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: chat.slice(-12), lang, userPos }) });
      if (!r.ok) throw 0;
      const j = await r.json();
      a = j.reply + (j.offline ? "\n\n" + t("offline") : "");
    } catch {
      a = t("err");
    }
    w.classList.remove("wait");
    w.textContent = a;
    $("#chatLog").scrollTop = $("#chatLog").scrollHeight;
    chat.push({ role: "assistant", content: a });
  }

  // ---------- i18n ----------
  function applyLang() {
    document.documentElement.lang = lang;
    $("#langBtn b").textContent = lang === "vi" ? "EN" : "VI";
    $$("[data-t]").forEach((e) => (e.textContent = t(e.dataset.t)));
    $$("[data-ph]").forEach((e) => (e.placeholder = t(e.dataset.ph)));
    $("#appTitle").textContent = t(TITLES[tab]);
    $("#splashSub").textContent = t("sub");
    renderSuggest();
    if (!D) return;
    renderExplore(); renderNear(); renderChips(); renderStay(); renderMarket(); renderCart(); drawMarkers();
  }

  // ---------- Ripple ----------
  document.addEventListener("pointerdown", (e) => {
    const b = e.target.closest(".btn,.row,.ccard,.add,.send,.mchip");
    if (!b) return;
    const r = b.getBoundingClientRect();
    const s = document.createElement("span");
    s.className = "ripple";
    s.style.left = e.clientX - r.left + "px";
    s.style.top = e.clientY - r.top + "px";
    s.style.setProperty("--s", Math.ceil(Math.hypot(r.width, r.height) / 5));
    if (getComputedStyle(b).position === "static") b.style.position = "relative";
    b.style.overflow = "hidden";
    b.appendChild(s);
    setTimeout(() => s.remove(), 600);
  });

  // ---------- Events ----------
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-tab],[data-open],[data-add],[data-inc],[data-dec],[data-q],[data-ask],[data-cat],.segmented button");
    if (!el) return;
    const d = el.dataset;
    if (el.parentElement && el.parentElement.classList.contains("segmented")) {
      $$("button", el.parentElement).forEach((b) => b.classList.toggle("on", b === el));
      if (el.parentElement.dataset.seg === "stay") { staySeg = d.val; renderStay(); } else { marketSeg = d.val; renderMarket(); }
      return;
    }
    if (d.tab) go(d.tab);
    else if (d.open) openItem(d.open);
    else if (d.add) {
      const it = cart.find((c) => c.id === d.add);
      it ? it.qty++ : cart.push({ id: d.add, qty: 1 });
      saveCart();
      snack(t("added"));
      plugin("Haptics") && plugin("Haptics").impact({ style: "LIGHT" }).catch(() => {});
    } else if (d.inc) { cart.find((c) => c.id === d.inc).qty++; saveCart(); }
    else if (d.dec) { const c = cart.find((x) => x.id === d.dec); if (--c.qty <= 0) cart = cart.filter((x) => x !== c); saveCart(); }
    else if (d.q) ask(d.q);
    else if (d.ask) ask(lang === "vi" ? `Giới thiệu chi tiết về ${d.ask}` : `Tell me more about ${d.ask}`);
    else if (d.cat) { mapCat = d.cat; renderChips(); drawMarkers(); renderNear(); }
  });
  $("#chatForm").addEventListener("submit", (e) => { e.preventDefault(); const v = $("#chatInput").value; $("#chatInput").value = ""; $("#chatInput").blur(); ask(v); });
  $("#locateBtn").addEventListener("click", locate);
  $("#fabLocate").addEventListener("click", locate);
  $("#pageBack").addEventListener("click", closePage);
  $("#cartBtn").addEventListener("click", () => sheet(true));
  $("#scrim").addEventListener("click", () => sheet(false));
  $("#langBtn").addEventListener("click", () => { lang = lang === "vi" ? "en" : "vi"; localStorage.setItem("lang", lang); applyLang(); });
  $("#orderForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!cart.length) return snack(t("empty"));
    const btn = e.target.querySelector("[type=submit]");
    btn.disabled = true;
    try {
      const r = await fetch(API + "/api/order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...Object.fromEntries(new FormData(e.target)), items: cart, lang }) });
      if (!r.ok) throw 0;
      const j = await r.json();
      cart = []; saveCart(); e.target.reset(); sheet(false);
      snack(t("orderOk") + j.id);
    } catch { snack(t("err")); }
    btn.disabled = false;
  });

  // Android hardware back button
  let lastBack = 0;
  const App = plugin("App");
  if (App) App.addListener("backButton", () => {
    if (sheetOpen()) return sheet(false);
    if (pageOpen()) return closePage();
    if (tab !== "explore") return go("explore");
    if (Date.now() - lastBack < 2000) return App.exitApp();
    lastBack = Date.now();
    snack(t("exitHint"));
  });

  // ---------- Boot ----------
  $("#splashLogo").innerHTML = icon("mango");
  paint();
  applyLang();
  bubble("bot", t("hi"));
  const started = Date.now();
  const load = (u) => fetch(u, { cache: "no-store" }).then((r) => { if (!r.ok) throw 0; return r.json(); });
  // Fresh content from the server; fall back to the copy bundled in the APK when offline.
  Promise.race([load(API + "/data/content.json"), new Promise((_, no) => setTimeout(no, 6000))])
    .catch(() => load("content.json"))
    .then((json) => {
      D = json;
      applyLang();
      const qt = new URLSearchParams(location.search).get("tab"); // deep link, e.g. ?tab=map
      if (TITLES[qt]) go(qt);
      setTimeout(() => $("#splash").classList.add("gone"), Math.max(0, 1100 - (Date.now() - started)));
    })
    .catch(() => { $("#splash").classList.add("gone"); snack(t("err")); });
})();
