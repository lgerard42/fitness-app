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
