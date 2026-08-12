const { chromium } = require("@playwright/test");

module.exports = {
  chromePath: chromium.executablePath(),
  settings: {
    formFactor: "mobile",
    screenEmulation: {
      width: 412,
      height: 823,
      deviceScaleFactor: 2,
      mobile: true,
      disabled: false,
    },
    throttling: {
      rttMs: 150,
      throughputKbps: 1562.5,
      requestLatencyMs: 150,
      downloadThroughputKbps: 1562.5,
      uploadThroughputKbps: 732.421875,
      cpuSlowdownMultiplier: 4,
    },
    throttlingMethod: "devtools",
    disableStorageReset: true,
    onlyCategories: ["performance"],
  },
};
