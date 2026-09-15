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

async function shot(name) {
  const path = `${ART}/${name}.png`;
  await page.screenshot({ path, fullPage: false });
  copyFileSync(path, `${MEDIA}/${name}.png`);
  log.push({ shot: name, url: page.url() });
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

await page.goto(`${BASE}/zugang`, { waitUntil: "networkidle" });
await page.fill("#access-code", ACCESS_CODE);
await page.getByRole("button", { name: /Weiter/i }).click();
await page.waitForURL((url) => !url.pathname.includes("zugang"), {
  timeout: 15000,
});

async function openPerson(slug) {
  await page.goto(`${BASE}/?devTime=1`, { waitUntil: "networkidle" });
  if (page.url().includes("/zugang")) {
    await page.fill("#access-code", ACCESS_CODE);
    await page.getByRole("button", { name: /Weiter/i }).click();
    await page.waitForURL((url) => !url.pathname.includes("zugang"));
    await page.goto(`${BASE}/?devTime=1`, { waitUntil: "networkidle" });
  }
  await applyMorning();
  await page.locator(`a[href="/person/${slug}"]`).first().click();
  await page.waitForURL(`**/person/${slug}`);
  await applyMorning();
  await page.evaluate(() => {
    for (const el of document.querySelectorAll("aside")) {
      if (/Dev-Zeit/i.test(el.textContent || "")) el.style.display = "none";
    }
  });
  await page.waitForTimeout(slug === "levi" ? 2500 : 6000);
}

function weekChecks(text) {
  return {
    hasWeekTitle: /Wetter diese Woche/i.test(text),
    hasListDays: /Mo[\s\S]*Di[\s\S]*Mi/i.test(text),
    noSevenCardsHint: !/grid-cols-7/.test(text),
    hasPercent: /\d+\s*%/.test(text),
    hasMeineWoche: /Meine Woche/i.test(text),
    hasHeaderTemp: /\d+°/.test(text),
    excerpt: (text.match(/Wetter diese Woche[\s\S]{0,500}/) || [""])[0],
  };
}

await openPerson("birgit");
await shot("weather-week-birgit");
log.push({ step: "birgit", ...weekChecks(await page.locator("body").innerText()) });

await openPerson("heidi");
await shot("weather-week-heidi");
log.push({ step: "heidi", ...weekChecks(await page.locator("body").innerText()) });

await openPerson("levi");
await shot("weather-week-levi");
const leviText = await page.locator("body").innerText();
log.push({
  step: "levi",
  ...weekChecks(leviText),
  noMeineWoche: !/Meine Woche/i.test(leviText),
  noWorkBus: !/Bus zur Arbeit/i.test(leviText),
});

// Evening focus — tomorrow highlight path
await page.getByRole("button", { name: /Abend · Morgen-Fokus/i }).click().catch(() => {});
await page.waitForTimeout(800);
await page.evaluate(() => {
  for (const el of document.querySelectorAll("aside")) {
    if (/Dev-Zeit/i.test(el.textContent || "")) el.style.display = "none";
  }
});
await shot("weather-week-levi-evening");
log.push({
  step: "levi-evening",
  excerpt: (await page.locator("body").innerText()).slice(0, 500),
});

writeFileSync(`${ART}/weather-week-verify.json`, JSON.stringify(log, null, 2));
console.log(JSON.stringify(log, null, 2));
await browser.close();
