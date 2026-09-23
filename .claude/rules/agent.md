# Agent / LLM engineering

- **Providers:** OpenAI (primary, paid by the hackathon's $50 credit) and NVIDIA build.nvidia.com (fallback / cheap subtasks, $50 credit). Both speak the OpenAI-compatible API, so use the **OpenAI SDK** for both and switch `baseURL` + key by `LLM_PROVIDER=openai|nvidia` (NVIDIA base URL: `https://integrate.api.nvidia.com/v1`).
- Every LLM call goes through the single wrapper module named in PLAN.md. Never call an SDK directly anywhere else.
- Model IDs are chosen at planning time from each provider's current model list and live in one config constant. Don't hardcode model names anywhere else.
- Prompts live in their own files (e.g. `prompts/`), not inline strings.
- Every agent loop has a max-iterations cap, a per-call timeout and a token budget. On rate-limit or out-of-credit errors, fall back to the other provider, then to replay.
- Tools return structured results or structured errors; they never throw into the agent loop.
- Log every step (reasoning, tool call, tool result) in a structured format the UI can display — the visible agent trace is part of the demo.
- **Replay mode:** with `DEMO_MODE=record` the wrapper saves real LLM responses as fixtures; with `DEMO_MODE=replay` (or when no API key is set) it serves them instead of calling the API. Keep the golden path recorded and working.
- Keys come only from env vars (`OPENAI_API_KEY`, `NVIDIA_API_KEY`), are used server-side only, and are never sent to the browser.
