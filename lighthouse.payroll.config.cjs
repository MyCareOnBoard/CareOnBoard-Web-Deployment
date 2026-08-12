const { chromium } = require("@playwright/test");

module.exports = {
  settings: {
    chromePath: chromium.executablePath(),
    throttlingMethod: "devtools",
  },
};
