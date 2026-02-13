const JSON_HEADERS = { "Content-Type": "application/json" };

async function handleResponse(response) {
  let payload;

  try {
    payload = await response.json();
  } catch {
    throw new Error("Invalid JSON response from server.");
  }

  if (!response.ok) {
    throw new Error(payload?.error || `Request failed with status ${response.status}.`);
  }

  return payload;
}

export async function apiGet(path) {
  const response = await fetch(path, {
    method: "GET",
    headers: JSON_HEADERS
  });

  return handleResponse(response);
}

export async function apiPost(path, body) {
  const response = await fetch(path, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(body || {})
  });

  return handleResponse(response);
}

export async function startRoundRequest(dateOverride) {
  const body = {};
  if (dateOverride) {
    body.dateOverride = dateOverride;
  }
  return apiPost("/api/round/start", body);
}
