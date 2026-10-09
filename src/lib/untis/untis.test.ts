/** MOCK tests: the feed below is hand-written RFC 5545 text, NOT a real WebUntis export. */
import { describe, expect, it } from "vitest";
import { parseIcal } from "@/lib/untis/ical";
import { ageLabel, eventsForDate, isOutdated, trimEventWindow } from "@/lib/untis/select";
import { fetchUntisIcal, validateUntisUrl } from "@/server/untis/fetch-ical";

const FEED = [
  "BEGIN:VCALENDAR",
  "VERSION:2.0",
  "PRODID:-//test//EN",
  "BEGIN:VEVENT",
  "UID:a1",
  "DTSTART;TZID=Europe/Vienna:20261012T074500",
  "DTEND;TZID=Europe/Vienna:20261012T083500",
  "SUMMARY:Mathematik",
  "LOCATION:E12",
  "DESCRIPTION:Schularbeit",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:a2",
  "DTSTART:20261012T063500Z", // UTC → 08:35 in Vienna (CEST, +2)
  "DTEND:20261012T072500Z",
  "SUMMARY:Elektro\\, Labor",
  "LOCATION:W3",
  "STATUS:CANCELLED",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:a3",
  "DTSTART:20261012T092500",
  "DTEND:20261012T101500",
  "SUMMARY:Deutsch with a very long summary that is folded over",
  "  two lines",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20261026",
  "SUMMARY:Nationalfeiertag",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "UID:r1",
  "DTSTART:20261013T074500",
  "DTEND:20261013T083500",
  "RRULE:FREQ=WEEKLY",
  "SUMMARY:Wiederkehrend",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "SUMMARY:Ohne Zeit",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

describe("parseIcal", () => {
  const r = parseIcal(FEED);
  it("reads time, subject, room and info from the feed — nothing else", () => {
    expect(r.events[0]).toMatchObject({ date: "2026-10-12", start: "07:45", end: "08:35", subject: "Mathematik", room: "E12", info: "Schularbeit", cancelled: false });
  });
  it("converts UTC to the school's wall clock and unescapes text", () => {
    expect(r.events[1]).toMatchObject({ start: "08:35", end: "09:25", subject: "Elektro, Labor", cancelled: true });
  });
  it("unfolds long lines and treats floating times as school time", () => {
    expect(r.events[2]).toMatchObject({ start: "09:25", end: "10:15" });
    expect(r.events[2]!.subject).toContain("folded over two lines");
  });
  it("is honest about what it did not use", () => {
    expect(r.warnings.join(" ")).toContain("ganztägig");
    expect(r.warnings.join(" ")).toContain("Wiederholungsregel");
    expect(r.warnings.join(" ")).toContain("ohne lesbare Startzeit");
  });
  it("invents no room, teacher or cancellation", () => {
    const plain = parseIcal("BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART:20261012T074500\nDTEND:20261012T083500\nSUMMARY:Mathe\nEND:VEVENT\nEND:VCALENDAR");
    expect(plain.events[0]).toMatchObject({ room: "", info: "", cancelled: false });
  });
  it("winter time: UTC 06:45 on 2026-12-01 is 07:45 in Vienna", () => {
    const w = parseIcal("BEGIN:VEVENT\nDTSTART:20261201T064500Z\nDTEND:20261201T073500Z\nSUMMARY:X\nEND:VEVENT");
    expect(w.events[0]).toMatchObject({ date: "2026-12-01", start: "07:45", end: "08:35" });
  });
  it("other zone: 07:45 New York = 13:45 Vienna", () => {
    const w = parseIcal("BEGIN:VEVENT\nDTSTART;TZID=America/New_York:20261012T074500\nDTEND;TZID=America/New_York:20261012T083500\nSUMMARY:X\nEND:VEVENT");
    expect(w.events[0]).toMatchObject({ start: "13:45" });
  });
});

describe("select helpers", () => {
  const { events } = parseIcal(FEED);
  it("today / tomorrow selection and window", () => {
    expect(eventsForDate(events, "2026-10-12").map((e) => e.start)).toEqual(["07:45", "08:35", "09:25"]);
    expect(eventsForDate(events, "2026-10-11")).toEqual([]);
    expect(trimEventWindow(events, "2026-10-12").length).toBe(events.length);
    expect(trimEventWindow(events, "2026-11-30")).toEqual([]);
  });
  it("always says how old data is, and when it is outdated", () => {
    const now = new Date(2026, 9, 12, 12, 0);
    expect(ageLabel(now.getTime() - 5 * 60000, now)).toBe("vor 5 Min. (11:55)");
    expect(ageLabel(new Date(2026, 9, 12, 7, 12).getTime(), now)).toBe("heute 07:12");
    expect(ageLabel(new Date(2026, 9, 11, 18, 40).getTime(), now)).toBe("gestern 18:40");
    expect(isOutdated(now.getTime() - 30 * 60000, now)).toBe(false);
    expect(isOutdated(now.getTime() - 50 * 60000, now)).toBe(true);
  });
});

describe("validateUntisUrl", () => {
  it.each([
    ["https://urania.webuntis.com/WebUntis/Ical.do?token=x", true],
    ["webcal://urania.webuntis.com/WebUntis/x", true],
    ["http://urania.webuntis.com/x", false],
    ["https://evil.example.com/x", false],
    ["https://webuntis.com.evil.com/x", false],
    ["https://user:pw@urania.webuntis.com/x", false],
    ["https://127.0.0.1/x", false],
    ["https://localhost/x", false],
    ["https://urania.webuntis.com:8443/x", false],
    ["nonsense", false],
  ])("%s", (u, ok) => {
    expect(validateUntisUrl(u, {}).ok).toBe(ok);
  });
  it("extra hosts only through the server env", () => {
    expect(validateUntisUrl("https://schule.example.at/x", {}).ok).toBe(false);
    expect(validateUntisUrl("https://schule.example.at/x", { WEBUNTIS_ALLOWED_HOSTS: "example.at" }).ok).toBe(true);
  });
});

const URL_OK = "https://urania.webuntis.com/WebUntis/Ical.do?token=SECRET";
const res = (body: string, init: ResponseInit = {}) => new Response(body, { status: 200, ...init });

describe("fetchUntisIcal (mocked network)", () => {
  it("valid link → events", async () => {
    const r = await fetchUntisIcal(URL_OK, { fetchImpl: async () => res(FEED), now: () => 1234 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.fetchedAt).toBe(1234);
      expect(r.events.length).toBe(4);
    }
  });
  it("login page instead of a calendar → not_ical", async () => {
    const r = await fetchUntisIcal(URL_OK, { fetchImpl: async () => res("<html>Login</html>") });
    expect(r).toMatchObject({ ok: false, code: "not_ical" });
  });
  it.each([[401], [403], [404], [410]])("expired link (HTTP %i)", async (status) => {
    const r = await fetchUntisIcal(URL_OK, { fetchImpl: async () => res("", { status }) });
    expect(r).toMatchObject({ ok: false, code: "expired" });
  });
  it("server error → upstream", async () => {
    const r = await fetchUntisIcal(URL_OK, { fetchImpl: async () => res("", { status: 503 }) });
    expect(r).toMatchObject({ ok: false, code: "upstream" });
  });
  it("network failure and timeout", async () => {
    const net = await fetchUntisIcal(URL_OK, { fetchImpl: async () => { throw new TypeError("fetch failed"); } });
    expect(net).toMatchObject({ ok: false, code: "network" });
    const abort = await fetchUntisIcal(URL_OK, { fetchImpl: async () => { const e = new Error("x"); e.name = "AbortError"; throw e; } });
    expect(abort).toMatchObject({ ok: false, code: "timeout" });
  });
  it("empty calendar is a valid answer: zero events, no error", async () => {
    const r = await fetchUntisIcal(URL_OK, { fetchImpl: async () => res("BEGIN:VCALENDAR\r\nEND:VCALENDAR") });
    expect(r).toMatchObject({ ok: true, events: [] });
  });
  it("follows a redirect inside WebUntis but refuses one to another host", async () => {
    let n = 0;
    const ok = await fetchUntisIcal(URL_OK, {
      fetchImpl: async () => (n++ === 0 ? new Response(null, { status: 302, headers: { location: "https://other.webuntis.com/y" } }) : res(FEED)),
    });
    expect(ok.ok).toBe(true);
    const bad = await fetchUntisIcal(URL_OK, {
      fetchImpl: async () => new Response(null, { status: 302, headers: { location: "https://evil.example.com/y" } }),
    });
    expect(bad).toMatchObject({ ok: false, code: "not_allowed_host" });
  });
  it("never puts the link into an error message", async () => {
    const r = await fetchUntisIcal(URL_OK, { fetchImpl: async () => res("", { status: 404 }) });
    expect(JSON.stringify(r)).not.toContain("SECRET");
  });
  it("does not even call the network for a foreign host", async () => {
    let called = false;
    const r = await fetchUntisIcal("https://evil.example.com/x", { fetchImpl: async () => { called = true; return res(FEED); } });
    expect(called).toBe(false);
    expect(r).toMatchObject({ ok: false, code: "not_allowed_host" });
  });
});
