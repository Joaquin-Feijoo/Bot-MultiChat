import "./server.js";

import { connectTwitchChat } from "./twitch.js";

import { testKickAuth, subscribeToKickChat } from "./kick.js";

console.log("Chat Bridge iniciado");

// ============================================================
// TWITCH
// ============================================================

connectTwitchChat((message) => {
  console.log(`[Twitch] ${message.username}: ${message.message}`);
}).catch((error) => {
  console.error("Error conectando a Twitch:", error);
});

// ============================================================
// KICK
// ============================================================

try {
  await testKickAuth();

  await subscribeToKickChat();
} catch (error) {
  console.error("Error conectando a Kick:");

  console.error(error.message);
}
