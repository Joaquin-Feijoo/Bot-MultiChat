import "dotenv/config";

const config = {
  port: Number(process.env.PORT) || 3000,

  twitch: {
    clientId: process.env.TWITCH_CLIENT_ID,
    clientSecret: process.env.TWITCH_CLIENT_SECRET,
    channel: process.env.TWITCH_CHANNEL,
    botUsername: process.env.TWITCH_BOT_USERNAME,
    accessToken: process.env.TWITCH_ACCESS_TOKEN,
  },

  kick: {
    clientId: process.env.KICK_CLIENT_ID,
    clientSecret: process.env.KICK_CLIENT_SECRET,
    channel: process.env.KICK_CHANNEL,
    accessToken: process.env.KICK_ACCESS_TOKEN,
  },
};

export default config;
