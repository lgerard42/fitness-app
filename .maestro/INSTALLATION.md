# Maestro E2E Test Installation Guide

## Prerequisites

### 1. Java 17+ Required
Maestro requires Java 17 or higher. Check your version:
```bash
java -version
```

If not installed, download from: https://www.oracle.com/java/technologies/downloads/

### 2. Install Maestro CLI (Windows)

**Option A: Manual Installation (Recommended)**

1. Download Maestro for Windows:
   - Visit: https://github.com/mobile-dev-inc/maestro/releases
   - Download the latest `maestro-*-windows.zip` file

2. Extract to a folder (e.g., `C:\Users\<YourUser>\maestro`)

3. Add to PATH (Run PowerShell as Administrator):
   ```powershell
   [Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Users\<YourUser>\maestro\bin", [EnvironmentVariableTarget]::User)
   ```

4. Restart PowerShell and verify:
   ```bash
   maestro --version
   ```

**Option B: Using WSL2**

1. Install WSL2 (if not already installed):
   ```powershell
   wsl --install
   ```

2. In WSL2 terminal:
   ```bash
   sudo apt install openjdk-17-jdk
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```

### 3. Build and Install App

**For Android:**
```bash
# Build development version
eas build --profile development --platform android

# OR build locally
expo run:android

# Make sure Android emulator is running or device is connected
```

**For iOS (Mac only):**
```bash
# Build development version
eas build --profile development --platform ios

# OR build locally
expo run:ios

# Make sure iOS simulator is running or device is connected
```

### 4. Verify Device/Emulator Connection

**Android:**
```bash
# Install Android SDK tools first, then:
adb devices
# Should show your device/emulator
```

**iOS:**
```bash
xcrun simctl list devices
# Should show available simulators
```

## Running Tests

Once everything is installed:

```bash
# Run all E2E tests
npm run test:e2e

# Run on specific platform
npm run test:e2e:ios
npm run test:e2e:android

# Run specific test file
maestro test .maestro/01-navigation.yaml
```

## Troubleshooting

1. **Maestro not found**: Make sure PATH is set correctly and PowerShell is restarted
2. **Java not found**: Install Java 17+ and ensure JAVA_HOME is set
3. **App not found**: Build and install the app first
4. **No devices**: Start an emulator/simulator or connect a physical device
