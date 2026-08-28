import "./server.js";

import { connectTwitchChat } from "./twitch.js";

import { testKickAuth } from "./kick.js";

console.log("Chat Bridge iniciado");

connectTwitchChat((message) => {
  console.log(`[Twitch] ${message.username}: ${message.message}`);
}).catch((error) => {
  console.error("Error conectando a Twitch:", error);
});

try {
  await testKickAuth();
} catch (error) {
  console.error("Error con Kick:", error);
}
