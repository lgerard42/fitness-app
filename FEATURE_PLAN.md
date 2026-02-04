# Feature Plan: Animated Blue Progress Background for Active Rest Timer

## Current State Analysis

### File Structure
- **File**: `src/components/WorkoutTemplate/components/RestTimerBar.tsx`
- **Component**: `RestTimerBar` - Displays rest timer information below set rows

### Current Implementation
- The component receives `activeRestTimer: RestTimer | null` prop
- `RestTimer` interface includes:
  - `remainingSeconds: number` - Current time remaining
  - `totalSeconds: number` - Original total duration
  - `exerciseId: string`
  - `setId: string`
  - `isPaused: boolean`
- When `isRestTimerActive` is true, the component shows:
  - A bordered container (`restTimerBar__active` style)
  - Large timer text showing `formatRestTime(activeRestTimer.remainingSeconds)`
- The `restTimerBar` container currently has no background color when active

### Dependencies
- Uses `COLORS` from `@/constants/colors` for styling
- Uses `formatRestTime` utility for time formatting
- No animation libraries currently imported

## Proposed Changes (Step-by-Step)

### Step 1: Calculate Progress Percentage
**File**: `src/components/WorkoutTemplate/components/RestTimerBar.tsx`
**Location**: Inside component function, after `isRestTimerActive` calculation
**Changes**:
- Calculate progress: `remainingSeconds / totalSeconds` when timer is active
- Handle edge cases (division by zero, null values)
- Progress should be between 0 and 1 (0% to 100%)

**Code**:
```typescript
const progress = isRestTimerActive && activeRestTimer
  ? Math.max(0, Math.min(1, activeRestTimer.remainingSeconds / activeRestTimer.totalSeconds))
  : 1;
```

### Step 2: Add Progress Background View
**File**: `src/components/WorkoutTemplate/components/RestTimerBar.tsx`
**Location**: Inside `restTimerBar` View, when `isRestTimerActive` is true
**Changes**:
- Add an absolutely positioned View that acts as the progress background
- Position it behind the timer badge content
- Use `width: ${progress * 100}%` or similar to control the blue background width
- Apply blue background color (e.g., `COLORS.blue[100]` or `COLORS.blue[50]`)

**Implementation Approach**:
- Option A: Use a View with `position: 'absolute'` and `width` based on progress percentage
- Option B: Use a View with `flex` and `backgroundColor` that fills from left to right
- **Selected**: Option A - More precise control, works better with existing border styling

### Step 3: Add Progress Background Style
**File**: `src/components/WorkoutTemplate/components/RestTimerBar.tsx`
**Location**: In `localStyles` StyleSheet
**Changes**:
- Create `restTimerProgressBackground` style with:
  - `position: 'absolute'`
  - `left: 0`
  - `top: 0`
  - `bottom: 0`
  - `backgroundColor: COLORS.blue[100]` (or appropriate blue shade)
  - `borderRadius` to match container border radius
  - `zIndex: -1` or `0` to ensure it's behind content

### Step 4: Update Container Structure
**File**: `src/components/WorkoutTemplate/components/RestTimerBar.tsx`
**Location**: Inside `restTimerBar` View
**Changes**:
- Add the progress background View conditionally when `isRestTimerActive` is true
- Ensure proper z-index layering (background → progress → content)
- Maintain existing border and styling when active

## Potential Risks or Edge Cases

### 1. Performance Considerations
- **Risk**: Re-rendering on every second could cause performance issues
- **Mitigation**: React Native's reconciliation should handle this efficiently. The progress calculation is simple math.

### 2. Edge Cases
- **Division by zero**: If `totalSeconds` is 0, handle gracefully (default progress to 1 or 0)
- **Negative values**: Ensure `remainingSeconds` doesn't go negative
- **Progress > 1**: Clamp progress between 0 and 1
- **Timer completion**: When `remainingSeconds` reaches 0, progress should be 0

### 3. Visual Consistency
- **Risk**: Blue background might conflict with existing border styling
- **Mitigation**: Use a light blue shade (`COLORS.blue[50]` or `COLORS.blue[100]`) that complements the border
- Ensure the progress background respects the border radius

### 4. Z-Index Layering
- **Risk**: Progress background might cover timer text or other elements
- **Mitigation**: Use appropriate z-index values or order elements correctly (background first, then content)

### 5. Dropset Indicator Compatibility
- **Risk**: Progress background might interfere with dropset indicator positioning
- **Mitigation**: Dropset indicator is in `restTimerWrapper`, progress background is in `restTimerBar`, so they're separate layers

### 6. Border Radius Matching
- **Risk**: Progress background border radius must match container border radius
- **Mitigation**: Use same `borderRadius: 6` value as `restTimerBar__active`

## Implementation Details

### Progress Calculation
```typescript
const progress = isRestTimerActive && activeRestTimer && activeRestTimer.totalSeconds > 0
  ? Math.max(0, Math.min(1, activeRestTimer.remainingSeconds / activeRestTimer.totalSeconds))
  : 1;
```

### Progress Background View
```tsx
{isRestTimerActive && (
  <View style={[
    localStyles.restTimerProgressBackground,
    { width: `${progress * 100}%` }
  ]} />
)}
```

### Style Definition
```typescript
restTimerProgressBackground: {
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  backgroundColor: COLORS.blue[100],
  borderRadius: 6,
  zIndex: 0,
},
```

## User Approval Request

This plan implements an animated blue progress background that decreases as the rest timer counts down. The background will:
- Show a blue background when the timer is active
- Decrease proportionally as time elapses (remainingSeconds / totalSeconds)
- Respect existing border styling and layout
- Not interfere with dropset indicators or other UI elements

**Please review and approve this plan before I proceed with implementation.**
