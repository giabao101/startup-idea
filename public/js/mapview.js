// Map view with Google-Maps-style layers.
// - With a Google Maps JavaScript API key: Google basemaps (roadmap/satellite/terrain), traffic,
//   transit, bicycling, tilted 3D buildings (vector map), Street View, Google air-quality heatmap.
// - Without a key: Leaflet fallback (OSM, Esri satellite, OpenTopoMap, CyclOSM). Layers only Google
//   has (traffic, transit, 3D, Street View) open in Google Maps instead.
// Both: NASA FIRMS/VIIRS fire hotspots (GIBS WMS) and an Open-Meteo air-quality readout.
(function () {
  "use strict";

  const FIRE_LAYERS = "VIIRS_NOAA20_Thermal_Anomalies_375m_All,VIIRS_NOAA21_Thermal_Anomalies_375m_All,VIIRS_SNPP_Thermal_Anomalies_375m_All";
  const FIRE_WMS = "https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi";
  const yesterday = () => new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const MERC = 20037508.342789244;

  function tileBBox(x, y, z) {
    const n = 2 ** z, size = (2 * MERC) / n;
    x = ((x % n) + n) % n;
    const minx = -MERC + x * size, maxy = MERC - y * size;
    return [minx, maxy - size, minx + size, maxy].join(",");
  }
  const fireTileUrl = (x, y, z) =>
    `${FIRE_WMS}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=${FIRE_LAYERS}&STYLES=&FORMAT=image/png&TRANSPARENT=true` +
    `&WIDTH=256&HEIGHT=256&CRS=EPSG:3857&BBOX=${tileBBox(x, y, z)}&TIME=${yesterday()}`;

  // ---------- Links into Google Maps ----------
  const GM = {
    view(v, base = "roadmap", layer = "") {
      const u = new URL("https://www.google.com/maps/@");
      u.search = new URLSearchParams({ api: "1", map_action: "map", center: `${v.lat.toFixed(5)},${v.lng.toFixed(5)}`, zoom: String(Math.round(v.zoom)), basemap: base === "terrain" ? "terrain" : base === "satellite" ? "satellite" : "roadmap", ...(layer ? { layer } : {}) });
      return u.toString();
    },
    pano: (lat, lng) => `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`,
    place: (lat, lng) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    dir: (lat, lng) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
  };
  const GM_LAYER = { traffic: "traffic", transit: "transit", bicycling: "bicycling" };

  // Keyless Google Maps embed (same iframe as Google Maps "Share > Embed a map"). 5e0 = map, 5e1 = satellite.
  function embedUrl(lat, lng, zoom, base, lang) {
    const t = base === "satellite" ? 1 : 0;
    return `https://www.google.com/maps/embed?origin=mfe&pb=!1m4!2m1!1s${lat.toFixed(5)},${lng.toFixed(5)}!5e${t}!6i${Math.round(zoom)}!3m1!1s${lang}!5m1!1s${lang}`;
  }

  // ---------- Free 3D buildings: MapLibre GL + OpenFreeMap (no key) ----------
  const ML_VER = "5.24.1";
  function loadMapLibre() {
    if (window.maplibregl) return Promise.resolve();
    return new Promise((ok, no) => {
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = `https://unpkg.com/maplibre-gl@${ML_VER}/dist/maplibre-gl.css`;
      document.head.appendChild(css);
      const s = document.createElement("script");
      s.src = `https://unpkg.com/maplibre-gl@${ML_VER}/dist/maplibre-gl.js`;
      s.onload = ok;
      s.onerror = () => no(new Error("MapLibre failed to load"));
      document.head.appendChild(s);
    });
  }

  // ---------- Air quality readout (Open-Meteo, free, no key) ----------
  async function airQuality(lat, lng) {
    const u = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=us_aqi,pm2_5,pm10&timezone=auto`;
    const r = await fetch(u);
    if (!r.ok) throw new Error("aq " + r.status);
    const c = (await r.json()).current;
    return { aqi: Math.round(c.us_aqi), pm25: c.pm2_5, pm10: c.pm10 };
  }

  // ---------- Google Maps ----------
  function loadGoogle(key, language) {
    if (window.google && google.maps && google.maps.importLibrary) return Promise.resolve();
    return new Promise((resolve, reject) => {
      window.__gmReady = resolve;
      window.gm_authFailure = () => { window.__gmAuthFailed = true; document.dispatchEvent(new Event("gm-auth-failed")); };
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&language=${language}&region=VN&callback=__gmReady`;
      s.async = true;
      s.onerror = () => reject(new Error("Google Maps failed to load"));
      document.head.appendChild(s);
      setTimeout(() => reject(new Error("Google Maps load timeout")), 15000);
    });
  }

  async function googleView(o) {
    await loadGoogle(o.key, o.lang);
    const { Map, InfoWindow } = await google.maps.importLibrary("maps");
    const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");
    await google.maps.importLibrary("streetView");

    const map = new Map(o.el, {
      center: o.center, zoom: o.zoom, mapId: o.mapId,
      renderingType: google.maps.RenderingType.VECTOR,
      tiltInteractionEnabled: true, headingInteractionEnabled: true,
      mapTypeControl: false, streetViewControl: true, fullscreenControl: false,
      zoomControl: true, cameraControl: false, gestureHandling: "cooperative", clickableIcons: true,
    });
    const info = new InfoWindow();
    const markers = {};
    let me = null;
    const layers = { traffic: new google.maps.TrafficLayer(), transit: new google.maps.TransitLayer(), bicycling: new google.maps.BicyclingLayer() };
    const fire = new google.maps.ImageMapType({ getTileUrl: (c, z) => fireTileUrl(c.x, c.y, z), tileSize: new google.maps.Size(256, 256), opacity: 0.95, name: "fire" });
    const aq = new google.maps.ImageMapType({
      getTileUrl: (c, z) => `https://airquality.googleapis.com/v1/mapTypes/US_AQI/heatmapTiles/${z}/${c.x}/${c.y}?key=${encodeURIComponent(o.key)}`,
      tileSize: new google.maps.Size(256, 256), opacity: 0.55, name: "aq",
    });
    const sv = map.getStreetView();
    sv.setOptions({ addressControl: true, fullscreenControl: true, motionTracking: false });
    sv.addListener("visible_changed", () => o.onLayerChange && o.onLayerChange("streetview", sv.getVisible()));
    let base = "roadmap";

    const overlay = (t, on) => {
      const arr = map.overlayMapTypes;
      const i = arr.getArray().indexOf(t);
      if (on && i < 0) arr.push(t);
      if (!on && i >= 0) arr.removeAt(i);
    };

    return {
      kind: "google",
      setPoints(pts) {
        Object.values(markers).forEach((m) => (m.map = null));
        for (const k in markers) delete markers[k];
        pts.forEach((p) => {
          const el = document.createElement("div");
          el.innerHTML = p.pinHtml;
          const m = new AdvancedMarkerElement({ map, position: { lat: p.lat, lng: p.lng }, content: el.firstElementChild, title: p.title });
          m.addListener("click", () => { info.setContent(o.popupHtml(p)); info.open({ map, anchor: m }); });
          markers[p.key] = m;
        });
      },
      focus(key) {
        const m = markers[key];
        if (!m) return;
        map.panTo(m.position);
        map.setZoom(Math.max(map.getZoom(), 16));
        google.maps.event.trigger(m, "click");
      },
      setUser(pos) {
        const el = document.createElement("div");
        el.className = "me-pin";
        if (me) me.position = pos;
        else me = new AdvancedMarkerElement({ map, position: pos, content: el, title: o.t("map.you") });
        map.panTo(pos);
        map.setZoom(14);
      },
      resize() {},
      getView() { const c = map.getCenter(); return { lat: c.lat(), lng: c.lng(), zoom: map.getZoom(), base }; },
      setBase(b) { base = b; map.setMapTypeId(b === "satellite" ? "hybrid" : b); },
      supports() { return true; },
      async toggle(name, on) {
        if (layers[name]) { layers[name].setMap(on ? map : null); return true; }
        if (name === "fire") { overlay(fire, on); return true; }
        if (name === "aq") { overlay(aq, on); return true; }
        if (name === "buildings") {
          if (on) {
            if (map.getRenderingType && map.getRenderingType() !== google.maps.RenderingType.VECTOR) {
              // Raster map (no vector Map ID): fall back to 45° aerial imagery where Google has it.
              this.setBase("satellite");
            }
            if (map.getZoom() < 17) map.setZoom(17);
            map.setTilt(67.5);
            map.setHeading(30);
          } else { map.setTilt(0); map.setHeading(0); }
          return true;
        }
        if (name === "streetview") {
          if (!on) { sv.setVisible(false); return true; }
          const svc = new google.maps.StreetViewService();
          try {
            const { data } = await svc.getPanorama({ location: map.getCenter(), radius: 3000, source: google.maps.StreetViewSource.OUTDOOR });
            sv.setPosition(data.location.latLng);
            sv.setPov({ heading: 0, pitch: 0 });
            sv.setVisible(true);
            return true;
          } catch { return false; }
        }
        return false;
      },
      streetViewAt(lat, lng) {
        const svc = new google.maps.StreetViewService();
        return svc.getPanorama({ location: { lat, lng }, radius: 1500, source: google.maps.StreetViewSource.OUTDOOR })
          .then(({ data }) => { sv.setPosition(data.location.latLng); sv.setVisible(true); return true; })
          .catch(() => false);
      },
    };
  }

  // ---------- Leaflet fallback ----------
  function leafletView(o) {
    const L = window.L;
    const map = L.map(o.el, { zoomControl: false, scrollWheelZoom: false }).setView([o.center.lat, o.center.lng], o.zoom);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    const bases = {
      roadmap: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }),
      satellite: L.layerGroup([
        L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics" }),
        L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19 }),
      ]),
      terrain: L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", { maxZoom: 17, attribution: "&copy; OpenTopoMap (CC-BY-SA), OpenStreetMap" }),
    };
    let base = "roadmap";
    bases.roadmap.addTo(map);
    const over = {
      bicycling: L.tileLayer("https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm-lite/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "CyclOSM" }),
      fire: L.tileLayer.wms(FIRE_WMS, { layers: FIRE_LAYERS, format: "image/png", transparent: true, version: "1.3.0", time: yesterday(), attribution: "NASA FIRMS / GIBS" }),
    };
    const group = L.layerGroup().addTo(map);
    const markers = {};
    let me = null;
    let pts3d = [];
    let ml = null, mlBox = null;

    async function open3d() {
      await loadMapLibre();
      const c = map.getCenter();
      mlBox = document.createElement("div");
      mlBox.className = "ml-3d";
      mlBox.style.cssText = "position:absolute;inset:0;z-index:900"; // maplibre-gl.css sets position:relative on its container
      o.el.appendChild(mlBox);
      ml = new maplibregl.Map({
        container: mlBox, style: "https://tiles.openfreemap.org/styles/liberty",
        center: [c.lng, c.lat], zoom: Math.max(map.getZoom(), 16.5), pitch: 60, bearing: -25,
        maxPitch: 75, attributionControl: { compact: true },
      });
      ml.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
      o.el.classList.add("is-3d");
      pts3d.forEach((p) => {
        const el = document.createElement("div");
        el.innerHTML = p.pinHtml;
        const pin = el.firstElementChild;
        new maplibregl.Marker({ element: pin, anchor: "bottom" }).setLngLat([p.lng, p.lat])
          .setPopup(new maplibregl.Popup({ offset: 28, maxWidth: "280px" }).setHTML(o.popupHtml(p))).addTo(ml);
      });
    }
    function close3d() {
      if (!ml) return;
      const c = ml.getCenter();
      map.setView([c.lat, c.lng], Math.min(Math.round(ml.getZoom()), 18));
      ml.remove();
      mlBox.remove();
      o.el.classList.remove("is-3d");
      ml = mlBox = null;
    }
    return {
      kind: "leaflet",
      setPoints(pts) {
        pts3d = pts;
        group.clearLayers();
        for (const k in markers) delete markers[k];
        pts.forEach((p) => {
          const m = L.marker([p.lat, p.lng], { icon: L.divIcon({ className: "", html: p.pinHtml, iconSize: [34, 34], iconAnchor: [17, 34], popupAnchor: [0, -30] }) }).addTo(group);
          m.bindPopup(() => o.popupHtml(p));
          markers[p.key] = m;
        });
      },
      focus(key) { if (ml) close3d(); const m = markers[key]; if (m) { map.setView(m.getLatLng(), 16); m.openPopup(); } },
      setUser(pos) {
        const icon = L.divIcon({ className: "", html: '<div class="me-pin"></div>', iconSize: [18, 18] });
        if (me) me.setLatLng(pos); else me = L.marker(pos, { icon }).addTo(map).bindPopup(o.t("map.you"));
        map.setView(pos, 14);
      },
      resize() { map.invalidateSize(); if (ml) ml.resize(); },
      getView() { const c = map.getCenter(); return { lat: c.lat, lng: c.lng, zoom: map.getZoom(), base }; },
      setBase(b) { map.removeLayer(bases[base]); base = b; bases[b].addTo(map); bases[b].bringToBack && bases[b].bringToBack(); },
      supports(name) { return name in over || name === "aq" || name === "buildings"; },
      async toggle(name, on) {
        if (over[name]) { on ? over[name].addTo(map) : map.removeLayer(over[name]); return true; }
        if (name === "buildings") {
          if (on) { try { await open3d(); } catch { return false; } } else close3d();
          return true;
        }
        return name === "aq"; // readout only
      },
    };
  }

  window.MapView = {
    GM, GM_LAYER, airQuality, embedUrl,
    async create(o) {
      if (o.key) {
        try {
          const v = await googleView(o);
          if (window.__gmAuthFailed) throw new Error("auth");
          return v;
        } catch (e) {
          console.warn("Google Maps unavailable, using fallback map:", e.message);
          o.el.innerHTML = "";
        }
      }
      return leafletView(o);
    },
  };
})();
