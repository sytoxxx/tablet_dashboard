#!/usr/bin/env node
/**
 * Local mock School Jarvis Integration API for Phase 13 UI checks.
 * Not used in production. No secrets — accepts any Bearer token.
 */
const http = require("node:http");

const PORT = Number(process.env.MOCK_SJ_PORT || 43190);

const summary = {
  available: true,
  personId: "levi",
  focusDate: new Date().toISOString().slice(0, 10),
  nextExam: {
    subject: "Elektrotechnik",
    date: "2026-09-18",
    daysUntil: 4,
  },
  today: {
    recommendedStudyMinutes: 25,
    recommendation: "Schaltungen und Formeln kurz wiederholen.",
  },
  learning: {
    weakTopics: ["Ohmisches Gesetz", "Kirchhoff", "Wechselstrom"],
    dueFlashcards: 18,
  },
  action: {
    label: "Jetzt lernen",
    target: "recommended-learning",
  },
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
  if (
    req.method === "GET" &&
    url.pathname === "/api/integrations/coffee/school-summary"
  ) {
    const personId = url.searchParams.get("personId");
    const auth = req.headers.authorization || "";
    if (!auth.startsWith("Bearer ")) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "unauthorized" }));
      return;
    }
    if (personId !== "levi") {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "forbidden" }));
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ...summary, personId, focusDate: url.searchParams.get("focusDate") || summary.focusDate }));
    return;
  }
  if (req.method === "GET" && url.pathname === "/learn") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(
      `<!doctype html><html lang="de"><body><h1>School Jarvis Mock</h1><p>target=${url.searchParams.get("target")}</p></body></html>`,
    );
    return;
  }
  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  res.writeHead(404);
  res.end("not found");
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Mock School Jarvis on http://127.0.0.1:${PORT}`);
});
