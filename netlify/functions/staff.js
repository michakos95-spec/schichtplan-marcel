const { getJSON, setJSON } = require("./_lib/blobStore");
const { json, parseBody } = require("./_lib/http");
const { requireAdmin } = require("./_lib/authCheck");

exports.handler = async (event) => {
  if (event.httpMethod === "GET") {
    const staff = await getJSON("config/staff", { people: [] });
    return json(200, staff);
  }

  if (event.httpMethod === "PUT") {
    const auth = await requireAdmin(event);
    if (!auth.ok) return json(auth.status, { error: auth.message });

    const body = parseBody(event);
    if (!body || !Array.isArray(body.people)) {
      return json(400, { error: "Erwarte einen Body { people: [...] }." });
    }
    const data = { people: body.people, updatedAt: Date.now() };
    await setJSON("config/staff", data);
    return json(200, data);
  }

  return json(405, { error: "Methode nicht erlaubt." });
};
