/**
 * Response template for architecture advice
 */
export const ARCHITECT_RESPONSE_TEMPLATE = `
# Architecture Analysis
<!-- Assignment overview -->

## Current State
<!-- Current code assessment, existing patterns, etc. -->

## Architectural Approach
<!-- What pattern to follow and why -->

## Preparatory Refactoring
- **Considerations**: <!-- Pros and cons of preparatory refactoring to enable DRY implementation -->
- **Recommendation**: <!-- Whether to perform preparatory refactoring or not -->

## Risks
<!-- Potential impacts to existing functionality -->

## Research Needs
<!-- Optional: web search queries to perform for technical documentation, external examples, best practices -->
- 

## Implementation Plan
<!-- Sequenced steps with verification methods.
This is the checklist that the engineer will follow step by step.
Include steps for preparatory refactoring (if recommended) and web research (if required) for the change.
Be very specific about which files and functions, tests, documentation, etc. will be modified or created.
Leave no room for ambiguity. Be prescriptive and decisive. -->

- [ ] 1. 
- [ ] 2. 
- [ ] 3. 
`;
