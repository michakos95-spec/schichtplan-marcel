const { getStore } = require("@netlify/blobs");

const STORE_NAME = "dienstplan-station";

function store() {
  return getStore(STORE_NAME);
}

async function getJSON(key, fallback = null) {
  const val = await store().get(key, { type: "json" });
  return val === null || val === undefined ? fallback : val;
}

async function setJSON(key, value) {
  await store().setJSON(key, value);
}

async function deleteKey(key) {
  await store().delete(key);
}

// Liefert alle Keys unter einem Prefix, z.B. "months/2026-10/entries/" -> alle Personen-Einträge dieses Monats.
async function listByPrefix(prefix) {
  const { blobs } = await store().list({ prefix });
  return blobs.map((b) => b.key);
}

module.exports = { getJSON, setJSON, deleteKey, listByPrefix };
