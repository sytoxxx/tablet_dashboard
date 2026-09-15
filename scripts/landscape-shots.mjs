import { chromium } from "playwright-core";
import { mkdirSync, copyFileSync, writeFileSync } from "fs";

const PORT = process.env.PORT || "43145";
const BASE = `http://127.0.0.1:${PORT}`;
const ACCESS_CODE = process.env.COFFEE_MORNING_ACCESS_CODE || "dev-local-audit";
const ART = "/opt/cursor/artifacts/screenshots";
const MEDIA =
  "/cursor/stores/bc-fe859a88-a6d3-42a3-96f5-5d729436d708/media";
mkdirSync(ART, { recursive: true });
mkdirSync(MEDIA, { recursive: true });

const browser = await chromium.launch({
  executablePath: "/usr/bin/google-chrome-stable",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const page = await browser.newPage({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
});

const log = [];
const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(String(err)));

async function shot(name) {
  const path = `${ART}/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  const dest = `${MEDIA}/${name}.png`;
  copyFileSync(path, dest);
  log.push({ shot: name, path, dest, url: page.url() });
  return path;
}

async function applyMorning() {
  const sit = page
    .getByRole("button", { name: /Morgen · nächster|Vormittag/i })
    .first();
  if (await sit.count()) {
    await sit.click();
    await page.waitForTimeout(350);
  }
}

// Login via access gate — use existing local code; do not weaken Auth.
await page.goto(`${BASE}/zugang`, { waitUntil: "networkidle" });
await page.fill("#access-code", ACCESS_CODE);
await page.getByRole("button", { name: /Weiter/i }).click();
await page.waitForURL((url) => !url.pathname.includes("zugang"), {
  timeout: 15000,
});
await page.waitForTimeout(400);

await page.goto(`${BASE}/?devTime=1`, { waitUntil: "networkidle" });
await applyMorning();

async function openPerson(name, slug) {
  await page.goto(`${BASE}/?devTime=1`, { waitUntil: "networkidle" });
  // Re-login if middleware bounced us.
  if (page.url().includes("/zugang")) {
    await page.fill("#access-code", ACCESS_CODE);
    await page.getByRole("button", { name: /Weiter/i }).click();
    await page.waitForURL((url) => !url.pathname.includes("zugang"), {
      timeout: 15000,
    });
    await page.goto(`${BASE}/?devTime=1`, { waitUntil: "networkidle" });
  }
  await applyMorning();
  const tile = page.locator(`a[href="/person/${slug}"]`).first();
  await tile.waitFor({ state: "visible", timeout: 15000 });
  await tile.click();
  await page.waitForURL(`**/person/${slug}`);
  await applyMorning();
  // Hide Dev-Zeit chrome for clean product screenshots.
  await page.evaluate(() => {
    for (const el of document.querySelectorAll("aside")) {
      if (/Dev-Zeit/i.test(el.textContent || "")) {
        el.style.display = "none";
      }
    }
  });
  await page.waitForTimeout(slug === "levi" ? 2500 : 7000);
}

await openPerson("Birgit", "birgit");
await shot("landscape-birgit");
const birgitText = await page.locator("body").innerText();
const birgitScroll = await page.evaluate(() => ({
  scrollHeight: document.documentElement.scrollHeight,
  clientHeight: document.documentElement.clientHeight,
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
}));
log.push({
  step: "birgit",
  hasMeineWoche: /Meine Woche/i.test(birgitText),
  hasWeatherHeader: /\d+°/.test(birgitText),
  hasArbeitOrFrei: /arbeit|frei|uhr/i.test(birgitText),
  hasBus: /Bus|Los|Verbindung|Linie/i.test(birgitText),
  scroll: birgitScroll,
  overflowX: birgitScroll.scrollWidth > birgitScroll.clientWidth + 2,
  needsScroll:
    birgitScroll.scrollHeight > birgitScroll.clientHeight + 24,
  excerpt: birgitText.slice(0, 800),
});

await openPerson("Heidi", "heidi");
await shot("landscape-heidi");
const heidiText = await page.locator("body").innerText();
const heidiScroll = await page.evaluate(() => ({
  scrollHeight: document.documentElement.scrollHeight,
  clientHeight: document.documentElement.clientHeight,
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
}));
log.push({
  step: "heidi",
  hasMeineWoche: /Meine Woche/i.test(heidiText),
  hasWeatherHeader: /\d+°/.test(heidiText),
  hasArbeitOrFrei: /arbeit|frei|uhr/i.test(heidiText),
  hasBus: /Bus|Los|Verbindung|Linie/i.test(heidiText),
  scroll: heidiScroll,
  overflowX: heidiScroll.scrollWidth > heidiScroll.clientWidth + 2,
  needsScroll: heidiScroll.scrollHeight > heidiScroll.clientHeight + 24,
  excerpt: heidiText.slice(0, 800),
});

await openPerson("Levi", "levi");
await shot("landscape-levi");
const leviText = await page.locator("body").innerText();
const leviScroll = await page.evaluate(() => ({
  scrollHeight: document.documentElement.scrollHeight,
  clientHeight: document.documentElement.clientHeight,
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
}));
log.push({
  step: "levi",
  hasSchule: /Schule|Stundenplan|Jetzt|Als Nächstes/i.test(leviText),
  hasWeatherHeader: /\d+°/.test(leviText),
  noMeineWoche: !/Meine Woche/i.test(leviText),
  noWorkBus: !/Bus zur Arbeit/i.test(leviText),
  scroll: leviScroll,
  overflowX: leviScroll.scrollWidth > leviScroll.clientWidth + 2,
  needsScroll: leviScroll.scrollHeight > leviScroll.clientHeight + 24,
  excerpt: leviText.slice(0, 800),
});

log.push({ consoleErrors });

writeFileSync(`${ART}/landscape-verify.json`, JSON.stringify(log, null, 2));
console.log(JSON.stringify(log, null, 2));
await browser.close();
