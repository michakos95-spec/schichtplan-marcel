const { getJSON } = require("./blobStore");

// Prüft das Bearer-Token aus dem Authorization-Header gegen die in Blobs gespeicherte Session.
// Kein volles Nutzerkonten-System — ein einzelnes, gemeinsames Admin-Passwort reicht für dieses
// informelle Team-Tool (siehe plans/2026-09-08-dienstplan-netlify-backend.md, Design-Entscheidung 3).
async function requireAdmin(event) {
  const header =
    (event.headers && (event.headers.authorization || event.headers.Authorization)) || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return { ok: false, status: 401, message: "Nicht angemeldet." };
  }
  const token = match[1];
  const session = await getJSON(`sessions/${token}`);
  if (!session) {
    return { ok: false, status: 401, message: "Ungültige Sitzung — bitte erneut anmelden." };
  }
  if (Date.now() > session.expiresAt) {
    return { ok: false, status: 401, message: "Sitzung abgelaufen — bitte erneut anmelden." };
  }
  return { ok: true };
}

module.exports = { requireAdmin };
