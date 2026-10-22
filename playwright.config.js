// @ts-check
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "tests",
  timeout: 60_000,
  reporter: [["list"]],
  use: {
    headless: true,
    // Si tu Playwright no trae navegador, define PW_CHROMIUM con la ruta a un Chrome/Chromium instalado.
    launchOptions: process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
  },
});
