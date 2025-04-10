/**
 * Response template for architecture advice
 */
export const ARCHITECT_RESPONSE_TEMPLATE = `
{
  "currentState": string, // Current code assessment, existing patterns, etc.
  "architecturalApproach": string, // What pattern to follow and why
  "preparatoryRefactoring": {
    "considerations": string, // Pros and cons of preparatory refactoring to enable DRY implementation
    "recommendation": string // Whether to perform preparatory refactoring or not
  },
  "risks": string, // Potential impacts to existing functionality
  "researchNeeds": string[], // Optional: web search queries to perform for technical documentation, external examples, best practices
  "implementationPlan": string[] // Sequenced steps with verification methods
  // This is the checklist that the engineer will follow step by step.
  // include steps for preparatoryRefactoring (if recommended) and researchNeeds (if required) for the change
  // Be very specific about which files and functions, tests, documentation, etc. will be modified or created.
  // Leave no room for ambiguity. Be prescriptive and decisive.
}
  `;
