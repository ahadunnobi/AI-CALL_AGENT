# Voice Clone — Record Your Voice Samples

Place your voice sample `.wav` files in this folder to enable voice cloning via Coqui XTTS-v2.

## How to Record Good Voice Samples

### Requirements
- Format: **WAV, 16-bit, 22050 Hz or 44100 Hz, mono**
- Duration: **5–10 seconds** per clip
- Quantity: **3–5 clips** gives best results (but even 1 works)

### Recording with Audacity (free)
1. Download [Audacity](https://www.audacityteam.org/)
2. Set **Project Rate** to `22050 Hz` (bottom-left)
3. Press **Record ⏺** and speak naturally for 5–10 seconds
4. Press **Stop ⏹**
5. Go to **File → Export → Export as WAV**
   - Encoding: **Signed 16-bit PCM**
   - Save as `my_voice.wav` in this folder
6. Repeat 2–4 more times with different sentences

### What to Say
Say natural, varied sentences (not the same thing each time):
- "Hello, this is [your name]. Thanks for calling — how can I help you today?"
- "I'm not available right now, but I'd be happy to take a message."
- "The meeting is scheduled for Thursday at two PM. Please confirm your attendance."
- "Could you please repeat that? I want to make sure I get the details right."
- "Thank you for your patience. I'll make sure [owner] receives your message."

### Tips for Best Quality
- ✅ Record in a **quiet room** — no AC hum, fans, or background noise
- ✅ Speak at your **normal pace** — not too fast, not too slow
- ✅ Maintain **consistent distance** from the mic (~15 cm / 6 inches)
- ❌ Avoid clipping (if the waveform is flat-topped, lower your volume)
- ❌ Don't add music or effects in post-production

## Activating Voice Cloning
Once you have your file ready:
1. Set `TTS_ENGINE=coqui` in `.env`
2. Set `VOICE_SAMPLE_PATH=./voice-clone/my_voice.wav` in `.env`
3. Install Coqui TTS: `pip install TTS`
4. Restart the server — first run will download the XTTS-v2 model (~1.8 GB)

## Not Ready Yet?
No worries — the agent works out-of-the-box with `pyttsx3` (the default engine).
You can switch to voice cloning at any time without changing any other code.
