# AURA Mobile App - Setup Tutorial

This tutorial will guide you through setting up, building, and running the AURA mobile app on your Android or iOS device.

## Prerequisites

1.  **Node.js**: Ensure you have Node.js installed (v18+ recommended).
2.  **Expo CLI**: Install Expo globally if you haven't already:
    ```bash
    npm install -g expo-cli
    ```
3.  **Development Environment**:
    *   **For Android**: Install Android Studio and set up the Android SDK and an Android Emulator, or connect a physical Android device via USB debugging.
    *   **For iOS**: Install Xcode (requires a Mac).

## 1. Initial Setup

Navigate to your mobile app directory:
```bash
cd mobile-app
```

Install the project dependencies:
```bash
npm install
```

## 2. Building the Development Client

Because AURA uses native modules (like `llama.rn` for local AI and `@react-native-voice/voice` for STT), it **cannot** run in the standard "Expo Go" app. You must build a custom development client.

### Option A: Build an APK online (EAS Build - No Android Studio required)
If you do not have Android Studio installed on your computer, you can compile the `.apk` file using Expo's cloud build servers (EAS).

1. Install the EAS CLI:
   ```bash
   npm install -g eas-cli
   ```
2. Log in to your Expo account (you can create one for free at expo.dev):
   ```bash
   eas login
   ```
3. Build the APK:
   ```bash
   eas build -p android --profile preview
   ```
4. Once the build finishes (takes about 10-15 minutes), EAS will provide a link to download the `.apk` file. Download and install it on your Android phone!

*(Note: If EAS asks to set up the project automatically, say yes. If it asks to generate a new Android Keystore, say yes).*

### Option B: Build locally via Android Studio (Mac/Windows/Linux)
If you have Android Studio installed, run:
```bash
npx expo run:android
```
*   This will take several minutes the first time as it downloads Gradle and compiles the native code.
*   The app will automatically launch on your device/emulator once finished.

### Option C: Build for iOS (Mac Only)
Run the following command to compile and launch on the iOS Simulator or connected device:
```bash
npx expo run:ios
```
*   This will run `pod install` and compile the native iOS project.

## 3. Running the App

Once the custom client is built and installed on your phone, you might need to start the specific Expo development server.

1.  Start the dev server:
    ```bash
    npx expo start --dev-client
    ```
2.  Press `a` in the terminal to open the Android app, or `i` to open the iOS app.
3.  Alternatively, you can scan the QR code shown in the terminal using the camera app on your physical device.

## 4. Downloading the On-Device AI Model

AURA runs AI locally on your phone. To do this, it needs an AI model.

1.  Open the AURA app on your device.
2.  Navigate to the **Models** tab (the brain icon 🧠).
3.  You will see a list of available models (e.g., Qwen 0.5B, TinyLlama 1.1B).
4.  Tap **Download** next to "Qwen 0.5B" (Recommended for speed).
    *   *Note: This will download several hundred megabytes, so a Wi-Fi connection is recommended.*
5.  Once the download completes, the model is saved locally on your device. The app will automatically try to load it when you are in 'Local' or 'Auto' mode.

## 5. Configuring Hybrid Mode (Optional)

AURA can offload processing to your laptop's AI Brain when connected to the same Wi-Fi network. This process is much faster and uses a smarter model.

1.  Ensure your laptop AI Brain is running (`start.ps1` in the main project folder).
2.  Find your laptop's local IP address (e.g., `192.168.x.x`).
3.  In the AURA app, navigate to the **Settings** tab (the gear icon ⚙️).
4.  Under **Laptop Bridge URL**, enter your laptop's IP address and port (e.g., `http://192.168.1.100:8000`).
5.  Tap **Save** and then **Test Connection** to ensure the app can reach your laptop.
6.  Select **Auto** or **Laptop Only** under Inference Mode.

## 6. Testing a Call

1.  Navigate to the **Dashboard** tab (the home icon 🏠).
2.  Ensure the "Call" status is "IDLE".
3.  Tap **Start Demo Call**.
4.  The agent will speak a greeting. Wait for it to finish.
5.  Speak clearly into your phone's microphone.
6.  You will see your speech transcribed in the "Live Activity" log.
7.  The AI will process your input (either locally or via the laptop bridge) and respond.
8.  Tap **End Call** when finished.
