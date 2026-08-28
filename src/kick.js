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

// ============================================================
// TOKEN
// ============================================================

export async function testKickAuth() {
  console.log("✅ Token de Kick válido.");
}

// ============================================================
// OBTENER CANAL
// ============================================================

export async function getKickChannel() {
  const slug = config.kick.channel;

  const data = await kickRequest(`/channels?slug=${encodeURIComponent(slug)}`);

  if (!data.data?.length) {
    throw new Error(`No se encontró el canal de Kick: ${slug}`);
  }

  const channel = data.data[0];

  console.log("\n=== KICK CHANNEL ===");
  console.log("ID:", channel.broadcaster_user_id);
  console.log("Usuario:", channel.slug);
  console.log("====================\n");

  return channel;
}

// ============================================================
// SUSCRIPCIÓN AL CHAT
// ============================================================

export async function subscribeToKickChat() {
  const channel = await getKickChannel();

  const body = {
    events: [
      {
        name: "chat.message.sent",
        version: 1,
      },
    ],
    method: "webhook",
    broadcaster_user_id: channel.broadcaster_user_id,
  };

  const data = await kickRequest("/events/subscriptions", {
    method: "POST",
    body: JSON.stringify(body),
  });

  console.log("\n=== KICK SUBSCRIPTION ===");
  console.log(JSON.stringify(data, null, 2));
  console.log("=========================\n");

  console.log("✅ Suscripción al chat de Kick creada.");

  return data;
}

// ============================================================
// ENVIAR MENSAJE
// ============================================================

export async function sendKickMessage(message) {
  const data = await kickRequest("/chat", {
    method: "POST",
    body: JSON.stringify({
      content: message,
    }),
  });

  console.log(`[Kick] ${message}`);

  return data;
}
