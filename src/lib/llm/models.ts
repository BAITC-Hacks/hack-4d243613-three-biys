// The ONLY place model IDs live (rules/agent.md). Verify against provider lists before changing.
export const MODELS = {
  openai: {
    json: 'gpt-4.1-mini',        // clarify / card / techspec — structured JSON
    discover: 'gpt-4.1',         // discover — longer context
    transcribe: 'gpt-4o-transcribe',
    transcribeFallback: 'whisper-1',
  },
  nvidia: {
    json: 'meta/llama-3.3-70b-instruct',
    discover: 'meta/llama-3.3-70b-instruct',
  },
} as const;

export const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
