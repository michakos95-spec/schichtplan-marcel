const crypto = require("crypto");
const { getJSON, setJSON } = require("./_lib/blobStore");
const { json, parseBody } = require("./_lib/http");

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 Stunden

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Methode nicht erlaubt." });

  const body = parseBody(event);
  if (!body || typeof body.password !== "string") {
    return json(400, { error: "Passwort fehlt." });
  }

  const security = await getJSON("config/security");
  const expected =
    (security && security.adminPassword) || process.env.ADMIN_PASSWORD_DEFAULT || "marcel123";

  if (body.password !== expected) {
    return json(401, { error: "Falsches Passwort." });
  }

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  await setJSON(`sessions/${token}`, { createdAt: Date.now(), expiresAt });

  return json(200, { token, expiresAt });
};
