import config from "./config.js";

const KICK_API_URL = "https://api.kick.com/public/v1";

async function kickRequest(endpoint, options = {}) {
  const response = await fetch(`${KICK_API_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.kick.accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();

  let data;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(`Kick API ${response.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

export async function testKickAuth() {
  console.log("✅ Token de Kick válido.");
}

export async function sendKickMessage(message) {
  const data = await kickRequest("/chat", {
    method: "POST",
    body: JSON.stringify({
      content: message,
    }),
  });

  console.log(`[Kick → Chat] ${message}`);

  return data;
}
