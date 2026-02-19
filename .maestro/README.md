# Maestro E2E Tests

End-to-end tests for the Workout App using [Maestro](https://maestro.mobile.dev/).

## Prerequisites

1. **Install Maestro CLI:**
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```
   
   Or via npm:
   ```bash
   npm install -g @maestro-mobile/cli
   ```

2. **Build the app:**
   - For iOS: `eas build --profile development --platform ios` or `expo run:ios`
   - For Android: `eas build --profile development --platform android` or `expo run:android`

3. **Install the app** on a device/emulator

## Running Tests

```bash
# Run all tests
npm run test:e2e

# Run on specific platform
npm run test:e2e:ios
npm run test:e2e:android

# Run specific test file
maestro test .maestro/01-navigation.yaml
```

## Test Flows

- **01-navigation.yaml** - Basic tab navigation
- **02-start-workout.yaml** - Start new workout flow
- **03-library-browse.yaml** - Browse exercise library

## Adding New Tests

1. Create a new `.yaml` file in `.maestro/` directory
2. Use Maestro's declarative syntax (see [docs](https://maestro.mobile.dev/))
3. Test selectors can use:
   - Text matching: `"Workout"`
   - Regex: `".*workout.*"`
   - IDs: `id: "button-id"`
   - Accessibility labels

## Notes

- Tests use `appId: com.lgerard42.fitnessapp` (from app.json)
- Adjust selectors based on actual UI text/IDs
- Use `optional: true` for assertions that may not always be present
- Maestro automatically waits for elements and handles animations

## CI/CD Integration

Maestro tests can be integrated into EAS Workflows. See [Expo E2E docs](https://docs.expo.dev/build-reference/e2e-tests/).
