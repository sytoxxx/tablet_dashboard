export default function HomePage() {
  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 40 + "rem" }}>
      <h1>School Jarvis</h1>
      <p>
        Integration API für Coffee Morning:{" "}
        <code>/api/integrations/coffee/daily-summary</code>
      </p>
      <p>Keine Morning-UI hier — siehe README / Phase-14-Docs.</p>
    </main>
  );
}
