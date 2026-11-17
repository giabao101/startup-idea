// The app shows the same UI as the website: copy public/ into www/ before `cap sync`.
const fs = require("fs");
const path = require("path");
const src = path.join(__dirname, "..", "..", "public");
const www = path.join(__dirname, "..", "www");
fs.rmSync(www, { recursive: true, force: true });
fs.cpSync(src, www, { recursive: true });
console.log("copied public/ -> mobile/www/");
