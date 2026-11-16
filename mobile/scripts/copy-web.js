// Copy shared files from the website into the app bundle (offline fallback data + icon set).
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..", "..");
const www = path.join(__dirname, "..", "www");
for (const [from, to] of [["public/js/icons.js", "icons.js"], ["public/data/content.json", "content.json"]]) {
  fs.copyFileSync(path.join(root, from), path.join(www, to));
  console.log("copied", from, "->", "www/" + to);
}
