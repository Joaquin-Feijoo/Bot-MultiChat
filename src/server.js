import express from "express";
import crypto from "crypto";
import config from "./config.js";

const app = express();

const TWITCH_REDIRECT_URI = "http://localhost:3000/auth/twitch/callback";

const KICK_REDIRECT_URI = "http://localhost:3000/auth/kick/callback";

const KICK_AUTH_URL = "https://id.kick.com/oauth/authorize";

const KICK_TOKEN_URL = "https://id.kick.com/oauth/token";

// ============================================================
// KICK PKCE
// ============================================================

let kickOAuthState = null;
let kickCodeVerifier = null;

function generateCodeVerifier() {
  return crypto.randomBytes(64).toString("base64url");
}

function generateCodeChallenge(verifier) {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

// ============================================================
// HOME
// ============================================================

app.get("/", (req, res) => {
  res.send("Kick ↔ Twitch Chat Bridge funcionando");
});

// ============================================================
// TWITCH OAUTH
// ============================================================

app.get("/auth/twitch", (req, res) => {
  const params = new URLSearchParams({
    client_id: config.twitch.clientId,
    redirect_uri: TWITCH_REDIRECT_URI,
    response_type: "code",
    scope: ["user:read:chat", "user:write:chat"].join(" "),
  });

  res.redirect(`https://id.twitch.com/oauth2/authorize?${params.toString()}`);
});

app.get("/auth/twitch/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res
      .status(400)
      .send("No se recibió el código de autorización de Twitch.");
  }

  try {
    const params = new URLSearchParams({
      client_id: config.twitch.clientId,
      client_secret: config.twitch.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: TWITCH_REDIRECT_URI,
    });

    const response = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Error OAuth Twitch:", data);
      return res.status(500).send("Error OAuth de Twitch.");
    }

    console.log("\n=== TWITCH OAUTH ===");
    console.log("Access Token:", data.access_token);
    console.log("Refresh Token:", data.refresh_token);
    console.log("Scopes:", data.scope);
    console.log("====================\n");

    res.send("Twitch autorizado correctamente. Revisá la terminal.");
  } catch (error) {
    console.error("Error obteniendo token de Twitch:", error);

    res.status(500).send("Error interno obteniendo el token de Twitch.");
  }
});

// ============================================================
// KICK OAUTH - INICIO
// ============================================================

app.get("/auth/kick", (req, res) => {
  kickOAuthState = crypto.randomBytes(32).toString("hex");

  kickCodeVerifier = generateCodeVerifier();

  const codeChallenge = generateCodeChallenge(kickCodeVerifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.kick.clientId,
    redirect_uri: KICK_REDIRECT_URI,

    scope: ["user:read", "channel:read", "chat:write", "events:subscribe"].join(
      " ",
    ),

    code_challenge: codeChallenge,
    code_challenge_method: "S256",

    state: kickOAuthState,
  });

  const authorizationUrl = `${KICK_AUTH_URL}?${params.toString()}`;

  console.log("\n=== KICK OAUTH ===");
  console.log("State generado.");
  console.log("PKCE Code Challenge generado.");
  console.log("Redirigiendo a Kick...");
  console.log("==================\n");

  res.redirect(authorizationUrl);
});

// ============================================================
// KICK OAUTH - CALLBACK
// ============================================================

app.get("/auth/kick/callback", async (req, res) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    console.error("\n=== KICK OAUTH ERROR ===");
    console.error("Error:", error);
    console.error("Descripción:", error_description || "Sin descripción");
    console.error("========================\n");

    return res.status(400).send(
      `Kick rechazó la autorización.<br><br>
       Error: ${error}<br>
       ${error_description || ""}`,
    );
  }

  if (!code) {
    return res.status(400).send("Kick no devolvió un código de autorización.");
  }

  if (!state) {
    return res.status(400).send("Kick no devolvió el parámetro state.");
  }

  if (state !== kickOAuthState) {
    console.error("State OAuth de Kick inválido.");

    return res.status(400).send("El parámetro state no coincide.");
  }

  if (!kickCodeVerifier) {
    return res.status(400).send("No se encontró el PKCE code_verifier.");
  }

  try {
    const params = new URLSearchParams({
      grant_type: "authorization_code",

      code,

      client_id: config.kick.clientId,

      client_secret: config.kick.clientSecret,

      redirect_uri: KICK_REDIRECT_URI,

      code_verifier: kickCodeVerifier,
    });

    const response = await fetch(KICK_TOKEN_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },

      body: params,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("\n=== KICK TOKEN ERROR ===");
      console.error("HTTP:", response.status);
      console.error(data);
      console.error("========================\n");

      return res
        .status(500)
        .send(
          "Kick rechazó el intercambio del código OAuth. Revisá la terminal.",
        );
    }

    console.log("\n=== KICK OAUTH SUCCESS ===");

    console.log("Access Token:", data.access_token);

    console.log("Refresh Token:", data.refresh_token);

    console.log("Token Type:", data.token_type);

    console.log("Expires In:", data.expires_in);

    console.log("Scopes:", data.scope);

    console.log("==========================\n");

    // Limpiamos los valores PKCE usados.
    kickOAuthState = null;
    kickCodeVerifier = null;

    res.send(`
      <h1>Kick autorizado correctamente ✅</h1>
      <p>Revisá la terminal para ver los tokens.</p>
      <p>Podés cerrar esta pestaña.</p>
    `);
  } catch (error) {
    console.error("Error obteniendo token de Kick:", error);

    res.status(500).send("Error interno obteniendo el token de Kick.");
  }
});

app.post("/webhooks/kick", (req, res) => {
  console.log("\n=== KICK WEBHOOK ===");
  console.log(JSON.stringify(req.body, null, 2));
  console.log("====================\n");

  res.sendStatus(200);
});

// ============================================================
// SERVER
// ============================================================

app.listen(config.port, () => {
  console.log(`Servidor HTTP escuchando en http://localhost:${config.port}`);
});
