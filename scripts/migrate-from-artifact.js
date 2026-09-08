#!/usr/bin/env node
// Übernimmt den Team-/Wunsch-/Dienstplan-Stand aus der ursprünglichen Claude-Artifact-Demo
// (siehe migration-data.json) einmalig in dieses Netlify-Backend. Danach nicht mehr nötig —
// nur relevant direkt nach dem ersten Deploy dieses Repos.
//
// Nutzung:
//   node scripts/migrate-from-artifact.js https://schichtplan-marcel-test.netlify.app
//
// Braucht Node 18+ (nutzt die globale fetch-API).

const fs = require("fs");
const path = require("path");

async function put(url, headers, body) {
  const res = await fetch(url, { method: "PUT", headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PUT ${url} fehlgeschlagen: ${res.status} ${text}`);
  }
}

async function main() {
  const base = process.argv[2];
  if (!base) {
    console.error("Nutzung: node scripts/migrate-from-artifact.js <https://deine-seite.netlify.app>");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(path.join(__dirname, "migration-data.json"), "utf8"));

  console.log("Anmelden...");
  const loginRes = await fetch(base.replace(/\/$/, "") + "/.netlify/functions/auth-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: process.env.ADMIN_PASSWORD || "marcel123" }),
  });
  if (!loginRes.ok) {
    const text = await loginRes.text().catch(() => "");
    throw new Error(
      `Login fehlgeschlagen: ${loginRes.status} ${text}\n` +
        "Falls das Passwort schon geändert wurde, per ADMIN_PASSWORD=... vor dem Befehl setzen."
    );
  }
  const { token } = await loginRes.json();
  const headers = { "Content-Type": "application/json", Authorization: "Bearer " + token };
  console.log("Angemeldet.");

  const root = base.replace(/\/$/, "") + "/.netlify/functions";
  const month = data.state.planningMonth;

  console.log("Team übertragen...");
  await put(root + "/staff", headers, { people: data.staff });

  console.log("Planungszeitraum übertragen...");
  await put(root + "/state", headers, data.state);

  console.log("Wunsch-Einträge übertragen...");
  for (const [personId, entry] of Object.entries(data.entries)) {
    await put(`${root}/entries?month=${month}&personId=${personId}`, headers, entry);
  }

  if (data.schedule) {
    console.log("Dienstplan übertragen...");
    await put(`${root}/schedule?month=${month}`, headers, data.schedule);
  }

  console.log("Fertig — Team, Planungszeitraum, Wünsche" + (data.schedule ? " und Dienstplan" : "") + " übertragen.");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
