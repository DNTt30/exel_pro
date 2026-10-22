// Build-time mode only: no query string, stored role or UI toggle can enable this in production.
export const isAgentSandbox = import.meta.env.DEV && import.meta.env.MODE === 'agent-sandbox';
