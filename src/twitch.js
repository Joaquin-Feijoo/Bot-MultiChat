import WebSocket from "ws";
import config from "./config.js";

const TWITCH_API_URL = "https://api.twitch.tv/helix";
const TWITCH_EVENTSUB_URL = "wss://eventsub.wss.twitch.tv/ws";

let twitchUser = null;
let socket = null;

async function twitchRequest(endpoint, options = {}) {
  const response = await fetch(`${TWITCH_API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Client-ID": config.twitch.clientId,
      Authorization: `Bearer ${config.twitch.accessToken}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Twitch API ${response.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

export async function getTwitchUser() {
  const data = await twitchRequest("/users");

  if (!data.data?.length) {
    throw new Error("No se encontró el usuario de Twitch.");
  }

  twitchUser = data.data[0];

  return twitchUser;
}

async function createChatSubscription(sessionId) {
  if (!twitchUser) {
    await getTwitchUser();
  }

  const body = {
    type: "channel.chat.message",
    version: "1",
    condition: {
      broadcaster_user_id: twitchUser.id,
      user_id: twitchUser.id,
    },
    transport: {
      method: "websocket",
      session_id: sessionId,
    },
  };

  const data = await twitchRequest("/eventsub/subscriptions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  console.log("✅ Suscripción de chat de Twitch creada.");
  console.log(`Canal: ${twitchUser.display_name}`);

  return data;
}

export async function connectTwitchChat(onMessage) {
  await getTwitchUser();

  console.log(`Twitch conectado como: ${twitchUser.display_name}`);

  socket = new WebSocket(TWITCH_EVENTSUB_URL);

  socket.on("open", () => {
    console.log("Conexión EventSub WebSocket establecida.");
  });

  socket.on("message", async (rawMessage) => {
    try {
      const message = JSON.parse(rawMessage.toString());

      console.log(`EventSub recibido: ${message.metadata?.message_type}`);

      if (message.metadata?.message_type === "session_welcome") {
        const sessionId = message.payload.session.id;

        console.log("Sesión EventSub:", sessionId);

        await createChatSubscription(sessionId);
        return;
      }

      if (message.metadata?.message_type === "notification") {
        if (message.metadata.subscription_type !== "channel.chat.message") {
          return;
        }

        const event = message.payload.event;

        const chatMessage = {
          platform: "twitch",
          id: event.message_id,
          username: event.chatter_user_name,
          message: event.message.text,
          channel: event.broadcaster_user_login,
        };

        console.log(`[Twitch] ${chatMessage.username}: ${chatMessage.message}`);

        onMessage(chatMessage);
      }

      if (message.metadata?.message_type === "session_reconnect") {
        console.log("Twitch solicita reconexión del WebSocket.");

        socket.close();
      }
    } catch (error) {
      console.error("Error procesando evento de Twitch:", error);
    }
  });

  socket.on("close", () => {
    console.log("WebSocket de Twitch cerrado.");
  });

  socket.on("error", (error) => {
    console.error("Error WebSocket de Twitch:", error.message);
  });
}

export async function sendTwitchMessage(message) {
  if (!twitchUser) {
    await getTwitchUser();
  }

  const body = {
    broadcaster_id: twitchUser.id,
    sender_id: twitchUser.id,
    message,
  };

  await twitchRequest("/chat/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  console.log(`[Twitch → Chat] ${message}`);
}
