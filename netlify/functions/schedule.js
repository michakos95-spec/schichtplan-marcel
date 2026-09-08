const { getJSON, setJSON } = require("./_lib/blobStore");
const { json, parseBody } = require("./_lib/http");
const { requireAdmin } = require("./_lib/authCheck");

exports.handler = async (event) => {
  const month = event.queryStringParameters && event.queryStringParameters.month;
  if (!month) return json(400, { error: "Parameter 'month' fehlt." });

  if (event.httpMethod === "GET") {
    const schedule = await getJSON(`schedules/${month}`, null);
    return json(200, schedule);
  }

  if (event.httpMethod === "PUT") {
    const auth = await requireAdmin(event);
    if (!auth.ok) return json(auth.status, { error: auth.message });

    const body = parseBody(event);
    if (!body || typeof body !== "object") {
      return json(400, { error: "Ungültiger Body." });
    }
    await setJSON(`schedules/${month}`, body);
    return json(200, body);
  }

  return json(405, { error: "Methode nicht erlaubt." });
};
