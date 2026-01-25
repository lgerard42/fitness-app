# Plan and Execute Workflow

## Rule: Mandatory Planning for Complex Tasks

**ALWAYS** generate a technical plan before writing code for tasks that meet any of the following criteria:
- Involves changes to more than one file
- Requires more than 50 lines of logic
- Modifies core architectural patterns
- Affects multiple components or utilities

## Plan File Requirements

Create a plan file named either:
- `REFACTOR_PLAN.md` for refactoring tasks
- `FEATURE_PLAN.md` for new feature development

The plan file MUST include the following sections:

### 1. Current State Analysis
- Document the existing code structure
- Identify relevant files and their current responsibilities
- Note any dependencies or coupling between components
- List current patterns and conventions in use

### 2. Proposed Changes (Step-by-Step)
- Break down the task into discrete, sequential steps
- For each step, specify:
  - Which files will be modified
  - What changes will be made
  - Why the change is necessary
- Order steps to minimize breaking changes
- Include file paths and approximate line counts

### 3. Potential Risks or Edge Cases
- Identify breaking changes
- List dependencies that might be affected
- Note any state management considerations
- Document UI/UX impacts
- Flag potential performance implications
- Consider backward compatibility

### 3a. Thinking Block: ExerciseItem Discriminated Union Analysis

**REQUIRED for logic changes spanning more than 2 files:**

For any logic change spanning more than 2 files, you MUST output a 'Thinking Block' analyzing how the change impacts the `ExerciseItem` discriminated union in `src/types/workout.ts`.

The Thinking Block MUST include:
- Current understanding of `ExerciseItem = Exercise | ExerciseGroup`
- How the proposed change affects each union member (`Exercise` vs `ExerciseGroup`)
- Type guards and narrowing strategies needed
- Impact on existing code that processes `ExerciseItem[]`
- Potential breaking changes to type narrowing logic
- Required updates to utility functions (`flattenExercises`, `reconstructExercises`, etc.)

Example Thinking Block format:
```
## Thinking: ExerciseItem Union Impact Analysis

**Current Structure:**
- `ExerciseItem = Exercise | ExerciseGroup`
- `Exercise.type = 'exercise'`
- `ExerciseGroup.type = 'group'`

**Proposed Change Impact:**
- [Analysis of how change affects Exercise type]
- [Analysis of how change affects ExerciseGroup type]
- [Type narrowing considerations]
- [Utility function updates needed]
```

### 4. User Approval Request
- End the plan with a clear request for user approval
- Wait for explicit confirmation before proceeding
- If user requests modifications, update the plan and re-request approval

## Execution Guidelines

- **DO NOT** start coding until the plan is approved
- Follow the plan step-by-step
- If deviations are needed during execution, pause and update the plan
- Update the plan file with completion status as work progresses

## Exceptions

Planning may be skipped for:
- Single-line fixes or typo corrections
- Simple variable renaming
- Documentation-only changes
- Trivial UI adjustments (< 10 lines)
