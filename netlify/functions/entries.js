const { getJSON, setJSON, listByPrefix } = require("./_lib/blobStore");
const { json, parseBody } = require("./_lib/http");

// Bewusst ohne Admin-Schutz: Mitarbeitende tragen ihre eigenen Tageswünsche ohne Login ein,
// genau wie in der ursprünglichen Artifact-Version (informelles Team-Tool, siehe Plan).
exports.handler = async (event) => {
  const month = event.queryStringParameters && event.queryStringParameters.month;
  if (!month) return json(400, { error: "Parameter 'month' fehlt." });

  if (event.httpMethod === "GET") {
    const keys = await listByPrefix(`months/${month}/entries/`);
    const out = {};
    for (const key of keys) {
      const personId = key.split("/").pop();
      out[personId] = await getJSON(key);
    }
    return json(200, out);
  }

  if (event.httpMethod === "PUT") {
    const personId = event.queryStringParameters && event.queryStringParameters.personId;
    if (!personId) return json(400, { error: "Parameter 'personId' fehlt." });

    const body = parseBody(event);
    if (!body || typeof body !== "object") {
      return json(400, { error: "Ungültiger Body." });
    }
    const data = { ...body, personId, updatedAt: Date.now() };
    await setJSON(`months/${month}/entries/${personId}`, data);
    return json(200, data);
  }

  return json(405, { error: "Methode nicht erlaubt." });
};
