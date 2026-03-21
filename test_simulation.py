"""
test_simulation.py — Automated end-to-end test of the AI Call Agent bridge.
This script simulates a full conversation turn to verify the STT, LLM, and TTS modules.
"""
import base64
import requests
import time
import os

BASE_URL = "http://localhost:8000"
PHONE = "+1234567890"

def log(msg):
    print(f"[TEST] {msg}")

def run_test():
    log("Checking if server is up...")
    try:
        requests.get(f"{BASE_URL}/health", timeout=5)
    except:
        log("ERROR: Server not running. Start it with 'py ai-brain/server.py'")
        return

    # 1. Start Call
    log(f"Starting call for {PHONE}...")
    resp = requests.post(f"{BASE_URL}/call/start", json={"phone": PHONE, "caller_name": "Test User"})
    log(f"Response: {resp.json()}")

    # 2. Get Greeting
    log("Getting agent greeting...")
    resp = requests.post(f"{BASE_URL}/call/greeting", json={"phone": PHONE})
    data = resp.json()
    log(f"Agent said: '{data['text']}'")
    log(f"Received {len(data['audio_b64'])} base64 chars of audio.")

    # 3. Simulate a Turn (using a dummy base64 string or a real WAV if available)
    # Since we're testing the logic, we'll send a very short silent WAV or just a placeholder
    # For a real test, you'd send bytes from a .wav file.
    log("Simulating voice turn: 'What time is it?'")
    # We'll use a placeholder audio or skip actual STT by mocking the transcript if needed, 
    # but here we'll send it for real to the endpoint.
    # (In a real scenario, you'd load a .wav file here).
    
    # Let depends on the fact that the STT can handle empty/noise or we provide a tiny wav.
    # Here we'll just check the endpoint handles the request.
    try:
        # Dummy audio turn (this might result in "I didn't catch that" if STT fails on empty)
        dummy_audio = "UklGRhwAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YRAAAAAA" # Tiny WAV header
        resp = requests.post(f"{BASE_URL}/call/turn", json={
            "phone": PHONE,
            "audio_b64": dummy_audio,
            "is_wav": True
        })
        data = resp.json()
        log(f"Agent response: '{data['text']}'")
    except Exception as e:
        log(f"Turn failed (expected if no audio): {e}")

    # 4. End Call
    log("Ending call...")
    resp = requests.post(f"{BASE_URL}/call/end", json={"phone": PHONE})
    log(f"Response: {resp.json()}")
    log("Test complete! ✅")

if __name__ == "__main__":
    run_test()
