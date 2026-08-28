import "./server.js";

import { connectTwitchChat } from "./twitch.js";

import { testKickToken, subscribeToKickChat } from "./kick.js";

console.log("Chat Bridge iniciado");

// ============================================================
// TWITCH
// ============================================================

connectTwitchChat((message) => {
  console.log(`[Twitch] ${message.username}: ${message.message}`);

  // Más adelante:
  // sendKickMessage(...)
}).catch((error) => {
  console.error("Error conectando a Twitch:", error);
});

// ============================================================
// KICK
// ============================================================

try {
  await testKickToken();

  await subscribeToKickChat(process.env.KICK_BROADCASTER_USER_ID);
} catch (error) {
  console.error("Error conectando a Kick:");

  console.error(error.message);
}
