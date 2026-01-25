# Token Optimization Rules

## Core Principle
Minimize output verbosity to reduce token usage and improve efficiency. Focus on code changes, not explanations.

## PROACTIVE RETRIEVAL: Workout Feature Modifications

**CRITICAL RULE:** Before proposing any modification to a workout feature, you MUST retrieve and read the corresponding hook in `src/components/WorkoutTemplate/hooks/`. Never assume state logic lives in the main component file.

## Specific Rules

### 1. Code Logic Explanations
- **Never explain obvious code logic**
- Avoid comments like "This function does X" when the function name and implementation make it clear
- Skip step-by-step walkthroughs of straightforward operations
- Only explain non-obvious patterns, complex algorithms, or architectural decisions

### 2. Code Comments
- **Omit comments for self-explanatory variable names**
- Prefer descriptive names over comments: `calculateTotalWeight()` not `// Calculate total weight`
- Only add comments for:
  - Complex business logic that isn't immediately clear
  - Workarounds or non-standard patterns
  - Performance optimizations that need justification
  - API contracts or external dependencies

### 3. File Output Strategy
- **If a user provides a large file as context, only output the specific changed blocks rather than the entire file**
- Use `search_replace` tool to make targeted edits
- Show only the modified sections with sufficient context (3-5 lines before/after)
- Only output full files when:
  - Explicitly requested by the user
  - Creating a new file
  - The entire file structure is being refactored

### 4. Variable Naming in Utilities
- **Use concise variable names in utility functions**
- Prefer short, clear names: `ex` for exercise, `set` for set, `id` for identifier
- In utility functions, context is usually clear from function parameters
- Balance readability with brevity
- Example: `updateExercisesDeep(list, instanceId, updateFn)` uses concise names appropriate for a utility

### 5. Response Structure
- Lead with the action taken, not the explanation
- Use bullet points for multiple changes
- Group related changes together
- Skip introductory paragraphs when the task is straightforward

## Examples

### ❌ Verbose (Avoid)
```javascript
// This function takes an exercise object and converts the weight values
// from one unit to another. It checks if the current unit is kg, and if so,
// converts to lbs by multiplying by 2.20462. Otherwise, it converts from
// lbs to kg by dividing by 2.20462.
function convertWorkoutUnits(exercise) {
  // ... implementation
}
```

### ✅ Concise (Preferred)
```javascript
function convertWorkoutUnits(exercise) {
  // ... implementation
}
```

---

**GROUND TRUTH:** Refer to `src/types/workout.ts` for all data structures.
