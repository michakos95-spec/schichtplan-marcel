const { getJSON, setJSON } = require("./_lib/blobStore");
const { json, parseBody } = require("./_lib/http");
const { requireAdmin } = require("./_lib/authCheck");

exports.handler = async (event) => {
  if (event.httpMethod === "GET") {
    const state = await getJSON("config/state", null);
    return json(200, state);
  }

  if (event.httpMethod === "PUT") {
    const auth = await requireAdmin(event);
    if (!auth.ok) return json(auth.status, { error: auth.message });

    const body = parseBody(event);
    if (!body || typeof body !== "object") {
      return json(400, { error: "Ungültiger Body." });
    }
    const data = { ...body, updatedAt: Date.now() };
    await setJSON("config/state", data);
    return json(200, data);
  }

  return json(405, { error: "Methode nicht erlaubt." });
};
