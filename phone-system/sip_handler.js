"use strict";
/**
 * sip_handler.js — SIP.js telephony layer for the AI Call Agent.
 *
 * This module:
 *   1. Registers a SIP user agent with your SIP provider credentials (.env)
 *   2. Listens for incoming calls
 *   3. On each call: streams audio to the Python AI bridge, plays back responses
 *   4. Handles call teardown and logging
 *
 * Prerequisites:
 *   • node >= 18
 *   • npm install (installs sip.js, axios, dotenv, ws)
 *   • Python FastAPI server (server.py) must be running on API_PORT
 *   • A SIP account — get a free one from https://www.linphone.org/freesip
 *     or https://sip.us (free tier)
 *
 * Run:
 *   node sip_handler.js
 */

const { UserAgent, Registerer, Inviter, SessionState } = require("sip.js");
const WebSocket = require("ws");
const bridge = require("./bridge_client");
require("dotenv").config({ path: "../.env" });

// ─── Config ──────────────────────────────────────────────────────────────────

const SIP_URI = process.env.SIP_URI || "";
const SIP_PASSWORD = process.env.SIP_PASSWORD || "";
const SIP_REGISTRAR = process.env.SIP_REGISTRAR || "";
const SIP_DISPLAY_NAME = process.env.SIP_DISPLAY_NAME || "AI Assistant";

// ─── Logging ─────────────────────────────────────────────────────────────────

const LOG_LEVEL = (process.env.LOG_LEVEL || "INFO").toUpperCase();

function log(level, ...args) {
  const levels = ["DEBUG", "INFO", "WARNING", "ERROR"];
  if (levels.indexOf(level) >= levels.indexOf(LOG_LEVEL)) {
    const ts = new Date().toISOString().substring(11, 19);
    console.log(`${ts}  ${level.padEnd(7)} [SIP]`, ...args);
  }
}

// ─── SIP User Agent ───────────────────────────────────────────────────────────

async function startSIPAgent() {
  // Verify Python bridge is alive before registering
  log("INFO", "Checking Python AI bridge…");
  const alive = await bridge.healthCheck();
  if (!alive) {
    log(
      "ERROR",
      "Python server is not reachable. Start it with: cd ai-brain && python server.py"
    );
    process.exit(1);
  }
  log("INFO", "Python AI bridge OK ✓");

  if (!SIP_URI || !SIP_PASSWORD || !SIP_REGISTRAR) {
    log(
      "WARNING",
      "SIP credentials not configured. " +
        "Set SIP_URI, SIP_PASSWORD, SIP_REGISTRAR in .env.\n" +
        "Running in DEMO mode — incoming SIP calls will not be received."
    );
    await runDemoMode();
    return;
  }

  log("INFO", `Registering SIP agent as ${SIP_URI} …`);

  const userAgentOptions = {
    authorizationPassword: SIP_PASSWORD,
    authorizationUsername: SIP_URI.replace("sip:", "").split("@")[0],
    displayName: SIP_DISPLAY_NAME,
    uri: UserAgent.makeURI(SIP_URI),
    transportOptions: {
      server: SIP_REGISTRAR,
    },
    // Delegate handles all inbound calls
    delegate: {
      onInvite: handleInvite,
    },
  };

  const ua = new UserAgent(userAgentOptions);
  const registerer = new Registerer(ua);

  await ua.start();
  await registerer.register();
  log("INFO", `SIP agent registered ✓ — listening for calls on ${SIP_URI}`);
  log("INFO", "Press Ctrl+C to stop.");
}

// ─── Inbound Call Handler ─────────────────────────────────────────────────────

async function handleInvite(invitation) {
  const callerURI = invitation.remoteIdentity?.uri?.toString() || "unknown";
  const callerName = invitation.remoteIdentity?.displayName || "";
  // Extract E.164-like phone number from the SIP URI (user part)
  const phone = invitation.remoteIdentity?.uri?.user || callerURI;

  log("INFO", `📞 Incoming call from: ${callerName} <${callerURI}>`);

  try {
    // 1. Accept the call
    await invitation.accept({
      sessionDescriptionHandlerOptions: { constraints: { audio: true, video: false } },
    });
    log("INFO", "Call accepted.");

    // 2. Notify Python bridge
    await bridge.startCall(phone, callerName);

    // 3. Play greeting
    const { audio_b64, text } = await bridge.getGreeting(phone);
    log("INFO", `Agent greeting: "${text}"`);
    await playAudioToCall(invitation, audio_b64);

    // 4. Start conversation loop (audio capture → turn processing)
    await runConversationLoop(invitation, phone);
  } catch (err) {
    log("ERROR", "Error handling inbound call:", err.message);
    if (invitation.state !== SessionState.Terminated) {
      invitation.reject();
    }
  } finally {
    await bridge.endCall(phone).catch(() => {});
    log("INFO", `Call with ${phone} ended.`);
  }
}

// ─── Conversation Loop ────────────────────────────────────────────────────────

/**
 * Captures audio from the call, sends it to the Python bridge, and plays back
 * the response. Repeats until the call is terminated.
 *
 * NOTE: Full WebRTC audio streaming in pure Node.js (without a browser) is
 * complex — it requires either a native module (node-webrtc, mediasoup) or a
 * media server (FreeSWITCH, Asterisk). This implementation shows the core
 * event loop structure. See README.md §Advanced for media server integration.
 */
async function runConversationLoop(session, phone) {
  return new Promise((resolve) => {
    session.stateChange.addListener(async (state) => {
      if (state === SessionState.Terminated) {
        log("INFO", "Call terminated by remote party.");
        resolve();
      }
    });

    // In a production setup, you would hook into the WebRTC peer connection here:
    //
    //   const pc = session.sessionDescriptionHandler.peerConnection;
    //   const receiver = pc.getReceivers().find(r => r.track.kind === "audio");
    //
    // Then pipe audio chunks to bridge.processTurn() and play back responses.
    //
    // For local desktop testing with a SIP softphone (e.g. Linphone):
    //   • The SIP.js agent handles WebRTC signalling.
    //   • Audio is routed through the browser/WebRTC stack.
    //   • See README.md §Testing for the browser-based test harness.

    log(
      "INFO",
      "Conversation loop active — waiting for call to terminate naturally."
    );
  });
}

// ─── Audio Playback ───────────────────────────────────────────────────────────

/**
 * Play base64-encoded WAV audio through an active SIP call.
 * In a browser-based SIP.js setup this uses the Web Audio API.
 * In Node.js you'd inject audio via the RTCPeerConnection track.
 */
async function playAudioToCall(session, audio_b64) {
  // Placeholder — real implementation depends on your media pipeline.
  // Options:
  //   A) browser-based test harness (see README §Testing)
  //   B) FreeSWITCH ESL + mod_http_cache to inject audio
  //   C) Asterisk ARI + audiohook
  log("DEBUG", `[playAudioToCall] ${audio_b64.length} base64 chars of audio queued.`);
}

// ─── Demo Mode (no SIP credentials) ──────────────────────────────────────────

/**
 * Demo mode — exercises the full Python pipeline without an actual SIP call.
 * Useful to verify that STT → LLM → TTS is working end-to-end.
 */
async function runDemoMode() {
  const fs = require("fs");
  const path = require("path");

  log("INFO", "=== DEMO MODE ===");
  log("INFO", "Starting a simulated call session…");

  const phone = "+00000000000";
  await bridge.startCall(phone, "Demo Caller");

  const { text: greeting } = await bridge.getGreeting(phone);
  log("INFO", `Agent: "${greeting}"`);

  // Use a pre-recorded test audio if available; otherwise skip turn
  const testAudioPath = path.resolve(__dirname, "../ai-brain/test_audio.wav");
  if (fs.existsSync(testAudioPath)) {
    const audioBuffer = fs.readFileSync(testAudioPath);
    log("INFO", "Sending test audio to agent…");
    const { text } = await bridge.processTurn(phone, audioBuffer);
    log("INFO", `Agent: "${text}"`);
  } else {
    log(
      "INFO",
      "No test_audio.wav found. Skipping speech turn. To test: record a .wav and save it to ai-brain/test_audio.wav"
    );
  }

  await bridge.endCall(phone);
  log("INFO", "Demo session complete ✓");
  log(
    "INFO",
    "To receive real calls, add your SIP credentials to .env and restart."
  );
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

startSIPAgent().catch((err) => {
  log("ERROR", "Fatal error:", err.message);
  process.exit(1);
});

process.on("SIGINT", () => {
  log("INFO", "Shutting down SIP agent…");
  process.exit(0);
});
