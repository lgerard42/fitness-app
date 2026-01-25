# React Native Best Practices

## Component Architecture

### Functional Components with Hooks

**Rule:** Use Functional Components with Hooks.

- Always use functional components, never class components
- Use React Hooks (`useState`, `useEffect`, `useMemo`, `useCallback`, etc.) for state and lifecycle
- Create custom hooks for reusable stateful logic
- Follow the hooks rules: only call hooks at the top level

**Example:**
```typescript
// ✅ Correct - Functional component with hooks
const MyComponent: React.FC<Props> = ({ prop1, prop2 }) => {
  const [state, setState] = useState(initialValue);
  
  useEffect(() => {
    // Side effects
  }, [dependencies]);
  
  return <View>...</View>;
};

// ❌ Incorrect - Class component
class MyComponent extends React.Component {
  // Avoid class components
}
```

## Styling

### Global Colors Constant

**Rule:** Always use the global `COLORS` constant from `src/constants/colors.js`.

- Never hardcode color values
- Always import and use `COLORS` from `src/constants/colors.js`
- Use the color palette structure: `COLORS.slate[500]`, `COLORS.blue[600]`, etc.
- For theme-aware colors, use the appropriate color scheme

**Example:**
```typescript
// ✅ Correct
import { COLORS } from '../../constants/colors';

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.slate[200],
  },
  text: {
    color: COLORS.slate[900],
  },
});

// ❌ Incorrect
const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff', // Hardcoded color
    borderColor: '#e2e8f0',     // Hardcoded color
  },
});
```

### StyleSheet.create for Styling

**Rule:** Prefer `StyleSheet.create` for all styling; avoid inline styles unless dynamic.

- Use `StyleSheet.create` for all static styles
- Only use inline styles when values are truly dynamic (computed at render time)
- Group related styles together in a single `StyleSheet.create` call
- Use array syntax for conditional styles: `[styles.base, condition && styles.conditional]`

**Example:**
```typescript
// ✅ Correct - StyleSheet.create for static styles
const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

// ✅ Correct - Inline for truly dynamic values
<View style={[styles.container, { width: dynamicWidth }]} />

// ❌ Incorrect - Inline for static styles
<View style={{ padding: 16, borderRadius: 8 }} />
```

## Icons

### Lucide-react-native for Icons

**Rule:** Use Lucide-react-native for all icons.

- Always import icons from `lucide-react-native`
- Use consistent icon sizing (typically 16, 20, or 24)
- Pass color prop explicitly using `COLORS` constant
- Use semantic icon names that match their purpose

**Example:**
```typescript
// ✅ Correct
import { Plus, Trash2, Check, Clock } from 'lucide-react-native';
import { COLORS } from '../../constants/colors';

<TouchableOpacity>
  <Plus size={20} color={COLORS.blue[600]} />
</TouchableOpacity>

// ❌ Incorrect
// Using other icon libraries or hardcoded icon components
```

## TypeScript Integration

### Type Safety

- Use TypeScript for all new components and files
- Define proper interfaces for component props
- Use type imports: `import type { ... } from '...'`
- Leverage discriminated unions for type narrowing
- Avoid `any` types; use `unknown` or proper types instead

### Component Props

- Always define a props interface for components
- Use `React.FC<Props>` or explicit function signatures
- Make optional props explicit with `?`
- Provide default values where appropriate

**Example:**
```typescript
// ✅ Correct
interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps> = ({ 
  label, 
  onPress, 
  disabled = false,
  variant = 'primary' 
}) => {
  // Component implementation
};
```

## Performance

### Optimization Patterns

- Use `useMemo` for expensive computations
- Use `useCallback` for event handlers passed to child components
- Avoid creating new objects/arrays in render without memoization
- Use `React.memo` for components that receive stable props
- Lazy load heavy components when possible

## File Organization

### Component Files

- One component per file (except for closely related sub-components)
- Co-locate component files with their styles
- Use descriptive file names that match the component name
- Group related components in directories

### Import Organization

- Group imports: React/React Native → Third-party → Local components → Types → Utils → Constants
- Use absolute imports via `@/` alias when configured
- Separate type imports: `import type { ... } from '...'`

**Example:**
```typescript
// ✅ Correct import order
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Trash2 } from 'lucide-react-native';

import MyComponent from '../MyComponent';
import type { MyType } from '../../types/myTypes';
import { myUtil } from '../../utils/myUtils';
import { COLORS } from '../../constants/colors';
```

---

**GROUND TRUTH:** Refer to `src/types/workout.ts` for all data structures.