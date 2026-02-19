# Maestro E2E Test Setup - Step by Step

## Current Status
✅ Java 21 installed  
✅ Test files created  
⚠️ Maestro CLI needs installation  
⚠️ App needs to be built and installed  

## Installation Options

### Option 1: Install Maestro via WSL2 (Recommended if WSL2 is available)

1. **Install a Linux distribution in WSL2** (if not already installed):
   ```powershell
   wsl --install -d Ubuntu
   ```

2. **In WSL2 terminal**, install Java and Maestro:
   ```bash
   sudo apt update
   sudo apt install openjdk-17-jdk curl
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```

3. **Add to PATH** (in WSL2):
   ```bash
   echo 'export PATH="$HOME/.maestro/bin:$PATH"' >> ~/.bashrc
   source ~/.bashrc
   ```

4. **Verify**:
   ```bash
   maestro --version
   ```

### Option 2: Manual Windows Installation

1. **Download Maestro**:
   - Visit: https://github.com/mobile-dev-inc/maestro/releases
   - Look for a Windows-compatible release or download the JAR file
   - Or check: https://docs.maestro.dev/getting-started/installing-maestro/windows

2. **Extract and add to PATH**:
   - Extract to a folder (e.g., `C:\Users\<YourUser>\maestro`)
   - Add `bin` folder to your PATH environment variable

3. **Verify**:
   ```powershell
   maestro --version
   ```

### Option 3: Use Docker (Alternative)

If Maestro supports Docker, you can run tests via Docker container.

## Build and Install App

### For Android:

1. **Start Android Emulator** or connect device:
   ```powershell
   # If using Android Studio emulator, start it from Android Studio
   # Or check if emulator is running:
   # (Need Android SDK installed)
   ```

2. **Build development version**:
   ```powershell
   eas build --profile development --platform android
   ```

3. **Install on device/emulator**:
   ```powershell
   # After build completes, install the APK
   # Or use:
   expo run:android
   ```

### For iOS (Mac only):

1. **Start iOS Simulator**:
   ```bash
   open -a Simulator
   ```

2. **Build and install**:
   ```bash
   expo run:ios
   ```

## Running Tests

Once Maestro is installed and app is running:

```powershell
# From project root
npm run test:e2e

# Or directly
maestro test .maestro

# Or specific test
maestro test .maestro/01-navigation.yaml
```

## Troubleshooting

### Maestro not found:
- Make sure PATH includes Maestro bin directory
- Restart PowerShell/terminal after adding to PATH
- Verify with `maestro --version`

### App not found:
- Make sure app is built and installed
- Check appId matches: `com.lgerard42.fitnessapp`
- Verify device/emulator is connected and app is running

### Tests fail:
- Use `maestro studio` to inspect UI and find correct selectors
- Update test files with actual text/IDs from your UI
- Check that app is in correct state before tests run

## Next Steps

1. Install Maestro CLI (choose one option above)
2. Build and install the app
3. Run tests: `npm run test:e2e`
4. Refine test selectors based on actual UI
