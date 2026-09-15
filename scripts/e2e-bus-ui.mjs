import { chromium } from 'playwright-core';
import { mkdirSync, writeFileSync } from 'fs';

const out = '/opt/cursor/artifacts/screenshots';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const log = [];

async function shot(name) {
  const path = `${out}/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  log.push({ shot: name, path, url: page.url() });
  return path;
}

function textHas(t, ...parts) {
  const low = t.toLowerCase();
  return parts.every(p => low.includes(p.toLowerCase()));
}

// Ensure seed-like data: clear localStorage on first load
await page.goto('http://127.0.0.1:43127/', { waitUntil: 'networkidle' });
await page.evaluate(() => {
  localStorage.clear();
  sessionStorage.clear();
});
await page.reload({ waitUntil: 'networkidle' });
await shot('01-home-wer-bist-du');
const homeText = await page.locator('body').innerText();
log.push({ step: 'home', ok: textHas(homeText, 'Wer bist du', 'Heidi', 'Birgit', 'Levi'), excerpt: homeText.slice(0, 300) });

// Heidi
await page.getByRole('link', { name: /Heidi/i }).first().click();
await page.waitForURL('**/person/heidi');
await page.waitForTimeout(8000); // bus poll
await shot('02-heidi-dashboard');
const heidiText = await page.locator('body').innerText();
log.push({
  step: 'heidi',
  url: page.url(),
  hasName: /Heidi/i.test(heidiText),
  hasVerbindungen: /Verbindung/i.test(heidiText),
  hasApfelmoar: /Apfelmoar/i.test(heidiText),
  hasLosgehen: /Losgehen/i.test(heidiText),
  hasLinie: /Linie/i.test(heidiText),
  hasPflegeverband: /Pflegeverband/i.test(heidiText),
  hasTEST: /\[TEST\]/.test(heidiText),
  excerpt: heidiText.match(/Nächste Verbindungen[\s\S]{0,800}|Dein Bus[\s\S]{0,500}|Verbindung 1[\s\S]{0,600}/)?.[0] || heidiText.slice(0, 500),
});

// Switch to Birgit via profile switcher
const birgitBtn = page.getByRole('button', { name: /^Birgit$/i });
await birgitBtn.click();
await page.waitForURL('**/person/birgit');
await page.waitForTimeout(8000);
await shot('03-birgit-dashboard');
const birgitText = await page.locator('body').innerText();
log.push({
  step: 'birgit',
  url: page.url(),
  hasName: /Birgit|Guten Morgen/i.test(birgitText),
  hasPflegeverband: /Pflegeverband/i.test(birgitText),
  hasAltersheim: /Altersheim/i.test(birgitText),
  hasUmstieg: /Umstieg|Linie/i.test(birgitText),
  hasApfelmoar: /Apfelmoar/i.test(birgitText),
  hasTEST: /\[TEST\]/.test(birgitText),
  excerpt: birgitText.match(/Nächste Verbindungen[\s\S]{0,1200}|Deine Verbindung[\s\S]{0,1200}|Ziel:[\s\S]{0,400}/)?.[0] || birgitText.slice(0, 600),
});

// Levi
await page.getByRole('button', { name: /^Levi$/i }).click();
await page.waitForURL('**/person/levi');
await page.waitForTimeout(3000);
await shot('04-levi-dashboard');
const leviText = await page.locator('body').innerText();
log.push({
  step: 'levi',
  url: page.url(),
  hasLevi: /Levi|HTL|zu Fuß|Losgehen/i.test(leviText),
  hasPflegeverband: /Pflegeverband/i.test(leviText),
  hasApfelmoarBus: /Apfelmoar Einkaufszentrum/i.test(leviText),
  excerpt: leviText.slice(0, 500),
});

// Back to Heidi
await page.getByRole('button', { name: /^Heidi$/i }).click();
await page.waitForURL('**/person/heidi');
await page.waitForTimeout(8000);
await shot('05-heidi-again');
const heidi2 = await page.locator('body').innerText();
log.push({
  step: 'heidi-again',
  hasApfelmoar: /Apfelmoar/i.test(heidi2),
  hasPflegeverband: /Pflegeverband/i.test(heidi2),
  hasVerbindungen: /Verbindung/i.test(heidi2),
});

// Home -> Birgit tile -> Heidi switcher
await page.goto('http://127.0.0.1:43127/', { waitUntil: 'networkidle' });
await page.getByRole('link', { name: /Birgit/i }).first().click();
await page.waitForURL('**/person/birgit');
await page.waitForTimeout(5000);
await page.getByRole('button', { name: /^Heidi$/i }).click();
await page.waitForURL('**/person/heidi');
await page.waitForTimeout(5000);
await shot('06-home-birgit-then-heidi');
const final = await page.locator('body').innerText();
log.push({
  step: 'home-birgit-heidi',
  url: page.url(),
  hasApfelmoar: /Apfelmoar/i.test(final),
  hasPflegeverband: /Pflegeverband/i.test(final),
});

writeFileSync('/opt/cursor/artifacts/e2e-bus-ui-log.json', JSON.stringify(log, null, 2));
console.log(JSON.stringify(log, null, 2));
await browser.close();
