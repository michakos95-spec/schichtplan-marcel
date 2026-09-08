const { setJSON } = require("./_lib/blobStore");
const { json, parseBody } = require("./_lib/http");
const { requireAdmin } = require("./_lib/authCheck");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Methode nicht erlaubt." });

  const auth = await requireAdmin(event);
  if (!auth.ok) return json(auth.status, { error: auth.message });

  const body = parseBody(event);
  if (!body || typeof body.newPassword !== "string" || !body.newPassword.trim()) {
    return json(400, { error: "Neues Passwort fehlt." });
  }

  await setJSON("config/security", { adminPassword: body.newPassword.trim(), updatedAt: Date.now() });
  return json(200, { ok: true });
};
