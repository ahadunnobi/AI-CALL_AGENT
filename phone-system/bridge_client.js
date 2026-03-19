"use strict";
/**
 * bridge_client.js — HTTP client for calling the Python FastAPI bridge.
 *
 * All communication between the Node.js SIP layer and the Python AI modules
 * goes through this module via the local FastAPI server (server.py).
 */

const axios = require("axios");
require("dotenv").config({ path: "../.env" });

const BASE_URL = `http://${process.env.API_HOST || "127.0.0.1"}:${process.env.API_PORT || "8000"}`;
const client = axios.create({ baseURL: BASE_URL, timeout: 60_000 });

/**
 * Check that the Python server is alive.
 * @returns {Promise<boolean>}
 */
async function healthCheck() {
  try {
    const res = await client.get("/health");
    return res.data?.status === "ok";
  } catch {
    return false;
  }
}

/**
 * Notify Python server that a new call has started.
 * @param {string} phone   — E.164 caller number, e.g. "+12025551234"
 * @param {string} name    — Caller name if known (from SIP INVITE)
 */
async function startCall(phone, name = "") {
  const res = await client.post("/call/start", { phone, caller_name: name });
  return res.data;
}

/**
 * Get the opening greeting audio for a call.
 * @param {string} phone
 * @returns {Promise<{audio_b64: string, text: string}>}
 */
async function getGreeting(phone) {
  const res = await client.post("/call/greeting", { phone, caller_name: "" });
  return res.data;
}

/**
 * Send caller audio and receive agent response audio.
 * @param {string} phone
 * @param {Buffer} audioBuffer  — WAV buffer from the call
 * @returns {Promise<{audio_b64: string, text: string}>}
 */
async function processTurn(phone, audioBuffer) {
  const audio_b64 = audioBuffer.toString("base64");
  const res = await client.post("/call/turn", {
    phone,
    audio_b64,
    is_wav: true,
    sample_rate: 16000,
  });
  return res.data;
}

/**
 * Notify Python server that a call has ended.
 * @param {string} phone
 */
async function endCall(phone) {
  const res = await client.post("/call/end", { phone });
  return res.data;
}

module.exports = { healthCheck, startCall, getGreeting, processTurn, endCall };
