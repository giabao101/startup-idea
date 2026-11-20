// Authored line icons (24px grid, 1.8 stroke, round caps) — one consistent set.
const ICON_PATHS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
  sparkles: '<path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  utensils: '<path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10"/><path d="M17 21V3c-2.2 1.5-3 4-3 7v3h3"/>',
  leaf: '<path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15"/><path d="M5 19l8-8"/>',
  bed: '<path d="M3 18V6M3 13h18v5M21 13a3 3 0 0 0-3-3h-7v3"/><circle cx="7" cy="10" r="1.6"/>',
  bag: '<path d="M5 8h14l-1 13H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  church: '<path d="M12 2v4M10 4h4"/><path d="M7 21V11l5-5 5 5v10"/><path d="M3 21h18"/><path d="M10 21v-4a2 2 0 0 1 4 0v4"/>',
  landmark: '<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8"/><path d="M3 21h18"/>',
  school: '<path d="M3 21h18M5 21V10l7-5 7 5v11"/><path d="M10 21v-5h4v5M12 9v2"/>',
  boat: '<path d="M3 16l2 4h14l2-4H3z"/><path d="M12 4v12M12 4l6 9h-6"/>',
  basket: '<path d="M3 10h18l-2 10H5L3 10z"/><path d="M8 10l3-6M16 10l-3-6M9 14v3M15 14v3"/>',
  pin: '<path d="M12 21s7-6.3 7-12a7 7 0 0 0-14 0c0 5.7 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  locate: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 12h11.5l2-8H6.2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  layers: '<path d="M12 3 2 8l10 5 10-5-10-5z"/><path d="M2 13l10 5 10-5"/><path d="M2 17.5l10 5 10-5"/>',
  car: '<path d="M5 16V11l2-5h10l2 5v5"/><path d="M3 16h18v3H3z"/><circle cx="7.5" cy="13.5" r=".6"/><circle cx="16.5" cy="13.5" r=".6"/>',
  bus: '<rect x="5" y="3" width="14" height="15" rx="2"/><path d="M5 11h14M8 18v3M16 18v3"/><circle cx="8.5" cy="14.5" r=".6"/><circle cx="15.5" cy="14.5" r=".6"/>',
  bike: '<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l4-7h5l3 7M10 9 8.5 6H6.5M14 6h2"/>',
  building: '<path d="M4 21V8l8-5 8 5v13"/><path d="M9 21v-5h6v5M8 11h.01M12 11h.01M16 11h.01"/>',
  person: '<circle cx="12" cy="4.5" r="2"/><path d="M9 21l1-7-2-1 1-5h6l1 5-2 1 1 7"/>',
  flame: '<path d="M12 21c-4 0-6.5-2.7-6.5-6.2C5.5 10 10 8 9.5 3c3.5 2 5 4.5 4.7 7.2C15.5 9.4 16 8 16 7c2 2 2.5 4.5 2.5 7.8 0 3.5-2.5 6.2-6.5 6.2z"/>',
  wind: '<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h16a3 3 0 1 1-3 3"/><path d="M3 16h7"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  send: '<path d="M4 12 20 4l-6 16-3-7-7-1z"/>',
  arrow: '<path d="M7 17 17 7M8 7h9v9"/>',
  sunset: '<path d="M3 18h18M6 14a6 6 0 0 1 12 0"/><path d="M12 4v3M4.9 7.9l1.4 1.4M19.1 7.9l-1.4 1.4M8 21h8"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  fish: '<path d="M2 12c3-5 9-6 14-3l5-3v12l-5-3c-5 3-11 2-14-3z"/><circle cx="7.5" cy="11" r=".8"/>',
  bowl: '<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M8 7c0-1 1-1 1-2M12 7c0-1 1-1 1-2M16 7c0-1 1-1 1-2"/>',
  pancake: '<path d="M3 13a9 9 0 0 0 18 0z"/><path d="M7 9l2-3M12 8V4M17 9l-2-3"/>',
  cup: '<path d="M6 9h12l-1.5 11h-9z"/><path d="M5 9a7 5 0 0 1 14 0"/>',
  cracker: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 10h.01M12 7.5h.01M15.5 11h.01M10 14.5h.01M14 15.5h.01"/>',
  mango: '<path d="M12 21c-5 0-8-3.5-8-8 0-5 4-9 9-9 4 0 7 3 7 7 0 6-3.5 10-8 10z"/><path d="M13 4c0-1 1-2 2-2"/>',
  banana: '<path d="M4 13c2 5 8 7 13 4 2-1.3 3.5-3.6 4-6-2 2.5-6 4-10 3-3-.7-5-2.5-7-1z"/><path d="M20 11V8"/>',
  jar: '<rect x="6" y="7" width="12" height="14" rx="2"/><path d="M8 3h8v4H8zM6 12h12"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  star: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>'
};

function icon(name, cls = "") {
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ICON_PATHS.pin}</svg>`;
}

// Map content ids to icons
const ICON_FOR = {
  "nha-tho": "church", "tu-vien-phanxico": "landmark", "quan-phong": "school", "ben-do": "boat",
  "vuon-xoai-my-hiep": "mango", "cho-que": "basket",
  "goi-xoai": "leaf", "banh-xeo": "pancake", "lau-mam": "bowl", "ca-linh": "fish", "che-xoai": "cup", "banh-phong": "cracker",
  x1: "mango", x2: "banana", x3: "cracker", x4: "boat", x5: "leaf", x6: "sunset", x7: "boat", x8: "jar",
  h1: "home", h2: "sunset", h3: "user",
  p1: "mango", p2: "leaf", p3: "cracker", p4: "jar", p5: "banana", p6: "basket",
  e1: "bowl", e2: "pancake", e3: "leaf"
};
