const jetpack = require("fs-jetpack");
let settings = "{}";

if (jetpack.exists("../settings.json")) {
    settings = jetpack.read("../settings.json");
} else {
    settings = jetpack.read("settings.json");
}
const config = JSON.parse(settings);
module.exports = config;