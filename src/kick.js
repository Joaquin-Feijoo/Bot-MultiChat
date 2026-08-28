import config from "./config.js";

const KICK_API_URL = "https://api.kick.com/public/v1";
const KICK_OAUTH_URL = "https://id.kick.com";

// ============================================================
// REQUEST A KICK API
// ============================================================

async function kickRequest(endpoint, options = {}) {
  const response = await fetch(`${KICK_API_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.kick.accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
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
// COMPROBAR TOKEN
// ============================================================

export async function testKickAuth() {
  const response = await fetch(`${KICK_OAUTH_URL}/oauth/token/introspect`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.kick.accessToken}`,
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
    throw new Error(`Kick OAuth ${response.status}: ${JSON.stringify(data)}`);
  }

  console.log("=== KICK TOKEN ===");
  console.log(JSON.stringify(data, null, 2));
  console.log("==================");

  if (!data?.data?.active) {
    throw new Error("El Access Token de Kick no está activo.");
  }

  console.log("✅ Token de Kick válido.");

  return data;
}

// ============================================================
// SUSCRIBIR CHAT DE KICK
// ============================================================

export async function subscribeToKickChat() {
  const broadcasterUserId = process.env.KICK_BROADCASTER_USER_ID;

  if (!broadcasterUserId) {
    throw new Error("Falta KICK_BROADCASTER_USER_ID en .env");
  }

  const body = {
    broadcaster_user_id: Number(broadcasterUserId),

    events: [
      {
        name: "chat.message.sent",
        version: 1,
      },
    ],

    method: "webhook",
  };

  console.log("\n=== KICK SUBSCRIPTION REQUEST ===");
  console.log(JSON.stringify(body, null, 2));
  console.log("=================================");

  const data = await kickRequest("/events/subscriptions", {
    method: "POST",
    body: JSON.stringify(body),
  });

  console.log("\n=== KICK SUBSCRIPTION RESPONSE ===");
  console.log(JSON.stringify(data, null, 2));
  console.log("==================================");

  console.log("✅ Suscripción de chat de Kick creada.");

  return data;
}

// ============================================================
// ENVIAR MENSAJE A KICK
// ============================================================

export async function sendKickMessage(message) {
  return kickRequest("/chat", {
    method: "POST",

    body: JSON.stringify({
      content: message,
    }),
  });
}
