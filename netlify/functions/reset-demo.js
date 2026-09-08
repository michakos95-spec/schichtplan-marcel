const { getJSON, setJSON, deleteKey, listByPrefix } = require("./_lib/blobStore");
const { json } = require("./_lib/http");
const { requireAdmin } = require("./_lib/authCheck");

const PREF = { WANT: "want", CAN: "can", RATHERNOT: "rathernot", CANNOT: "cannot" };

function pad(n) {
  return n < 10 ? "0" + n : "" + n;
}
function todayIso() {
  const d = new Date();
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
function monthStr(d) {
  return d.getFullYear() + "-" + pad(d.getMonth() + 1);
}
function daysInMonth(month) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}
function newId() {
  return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Methode nicht erlaubt." });

  const auth = await requireAdmin(event);
  if (!auth.ok) return json(auth.status, { error: auth.message });

  // Alten Monat aufräumen, falls vorhanden.
  const oldState = await getJSON("config/state");
  if (oldState && oldState.planningMonth) {
    const oldKeys = await listByPrefix(`months/${oldState.planningMonth}/entries/`);
    for (const key of oldKeys) await deleteKey(key);
    await deleteKey(`schedules/${oldState.planningMonth}`);
  }

  // Passwort zurück auf den Default.
  await setJSON("config/security", {
    adminPassword: process.env.ADMIN_PASSWORD_DEFAULT || "marcel123",
    updatedAt: Date.now(),
  });

  // Team neu mit den Beispiel-Freunden.
  const seedStaff = [
    { id: newId(), name: "Michael Koslowski" },
    { id: newId(), name: "Dr. Marcel Oehme" },
    { id: newId(), name: "Dr. Maximilian Mayrhofer-Schmid" },
    { id: newId(), name: "Der dämliche Schwachkopf" },
    { id: newId(), name: "Julius" },
  ];
  await setJSON("config/staff", { people: seedStaff, updatedAt: Date.now() });

  // Neuer Planungsmonat + offener Meldezeitraum.
  const now = new Date();
  const planningMonth = monthStr(new Date(now.getFullYear(), now.getMonth() + 1, 1));
  const windowStart = todayIso();
  const windowEndDate = new Date(now);
  windowEndDate.setDate(windowEndDate.getDate() + 10);
  const windowEnd =
    windowEndDate.getFullYear() + "-" + pad(windowEndDate.getMonth() + 1) + "-" + pad(windowEndDate.getDate());

  const state = {
    planningMonth,
    windowOpen: true,
    windowStart,
    windowEnd,
    slotsPerDay: 1,
    updatedAt: Date.now(),
  };
  await setJSON("config/state", state);

  // Beispiel-Wünsche für die ersten vier Personen (die fünfte bleibt bewusst unbeantwortet).
  const n = daysInMonth(planningMonth);
  const pattern = [PREF.WANT, PREF.CAN, PREF.CAN, PREF.RATHERNOT, PREF.CANNOT];
  for (let i = 0; i < 4; i++) {
    const person = seedStaff[i];
    const prefs = {};
    for (let day = 1; day <= n; day++) {
      prefs[day] = pattern[(day + i * 2) % pattern.length];
    }
    await setJSON(`months/${planningMonth}/entries/${person.id}`, {
      personId: person.id,
      name: person.name,
      prefs,
      updatedAt: Date.now(),
    });
  }

  return json(200, { ok: true, staff: seedStaff, state });
};
