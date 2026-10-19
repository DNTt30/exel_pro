// One fixed model for both client and proxy; old browser model preferences are ignored.
export const DEFAULT_GEMINI_MODEL = 'gemini-3.6-flash';
export const COPILOT_MAX_OUTPUT_TOKENS = 1024;
export const COPILOT_DETAIL_OUTPUT_TOKENS = 2048;

export function copilotOutputBudget(requested) {
  return Number.isInteger(requested) && requested > 0
    ? Math.min(requested, COPILOT_DETAIL_OUTPUT_TOKENS)
    : COPILOT_MAX_OUTPUT_TOKENS;
}

