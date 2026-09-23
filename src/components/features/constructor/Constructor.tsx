'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { AgentStep, CardField, Insight, TaskCard } from '@/lib/types';
import { AgentTrace } from '@/components/domain';
import { useStore } from '@/lib/store';
import { useHydrated } from '../useHydrated';
import { clarify, buildCard } from '@/lib/api-client';
import type { ClarifyResponse } from '@/lib/schemas';
import { rateCard } from '@/lib/rating';
import { CardEditor } from './CardEditor';

type ClarifyQuestion = ClarifyResponse['questions'][number];

// Same code rules as the card editor, applied to the raw draft.
const draftVagueness = (draft: string) =>
  draft.trim()
    ? rateCard({
      fields: {
        title: null, context: null, need: draft, users: null, data: null,
        constraints: null, expectedResult: null, successCriteria: null, contact: null,
      },
      confirmed: {},
    }).vagueness
    : [];

type Step = 'draft' | 'questions' | 'card';

export function Constructor() {
  const hydrated = useHydrated();
  const params = useSearchParams();
  const insightId = params.get('insight');
  const insight = useStore((s) => s.insights.find((i) => i.id === insightId));
  if (!hydrated) return null;
  return <Wizard key={insightId ?? 'manual'} insight={insight} />;
}

function Wizard({ insight }: { insight?: Insight }) {
  const router = useRouter();
  const createCard = useStore((s) => s.createCard);
  const [step, setStep] = useState<Step>('draft');
  const [draft, setDraft] = useState(insight?.draftText ?? '');
  const [industry, setIndustry] = useState('Logistics');
  const [topic, setTopic] = useState('Automation');
  const [questions, setQuestions] = useState<ClarifyQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [cardId, setCardId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trace, setTrace] = useState<AgentStep[]>([]);

  const runClarify = async () => {
    setBusy(true); setError(null);
    const res = await clarify({ draftText: draft, industry });
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    setTrace(res.trace);
    setQuestions([...res.data.questions].sort((a, b) => b.gain - a.gain));
    setStep('questions');
  };

  const runCard = async () => {
    setBusy(true); setError(null);
    const res = await buildCard({
      draftText: draft,
      answers: questions
        .filter((q) => answers[q.id]?.trim())
        .map((q) => ({ questionId: q.id, field: q.field, question: q.question, answer: answers[q.id].trim() })),
    });
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    const id = createCard({
      draftText: draft,
      industry,
      topic,
      fields: res.data.fields,
      fieldSource: res.data.fieldSource,
      origin: insight ? { kind: 'insight', insightId: insight.id } : { kind: 'manual' },
      // Evidence-based text stays a suggestion: no points until the business accepts and confirms it.
      suggestions: suggestionsFrom(insight),
    });
    setCardId(id);
    setStep('card');
  };

  return (
    <div className="space-y-6">
      <ol className="flex gap-4 text-sm">
        {(['draft', 'questions', 'card'] as Step[]).map((s, i) => (
          <li key={s} className={s === step ? 'font-semibold' : 'text-gray-500'}>
            {i + 1}. {s === 'draft' ? 'Draft' : s === 'questions' ? 'AI questions' : 'Card & publish'}
          </li>
        ))}
      </ol>

      {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {step === 'draft' && (
        <section className="space-y-3">
          <h1 className="text-2xl font-bold">Describe your need</h1>
          <textarea
            className="h-40 w-full rounded border p-3"
            placeholder="In a few sentences: what hurts and what you want to change"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          {draftVagueness(draft).map((v) => (
            <div key={v.phrase} className="text-xs text-amber-800">Vague: “{v.phrase}” — {v.ask}</div>
          ))}
          <div className="flex gap-3">
            <label className="text-sm">Industry
              <input className="ml-2 rounded border px-2 py-1" value={industry} onChange={(e) => setIndustry(e.target.value)} />
            </label>
            <label className="text-sm">Topic
              <input className="ml-2 rounded border px-2 py-1" value={topic} onChange={(e) => setTopic(e.target.value)} />
            </label>
          </div>
          <button
            disabled={busy || !draft.trim()}
            onClick={runClarify}
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {busy ? 'Analyzing…' : 'Clarify with AI'}
          </button>
        </section>
      )}

      {step === 'questions' && (
        <section className="space-y-4">
          <h1 className="text-2xl font-bold">AI found gaps in your draft</h1>
          {trace.length > 0 && (
            <details className="rounded border p-3 text-sm">
              <summary className="cursor-pointer text-gray-600">How the AI works</summary>
              <div className="mt-2"><AgentTrace steps={trace} /></div>
            </details>
          )}
          {questions.map((q) => (
            <div key={q.id} className="space-y-1">
              <div className="font-medium">{q.question}</div>
              <div className="text-xs text-gray-500">Why: {q.why} · <b>+{q.gain}</b> to {q.field as CardField}</div>
              <textarea
                className="h-20 w-full rounded border p-2"
                value={answers[q.id] ?? ''}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              />
            </div>
          ))}
          <div className="flex gap-2">
            <button className="rounded border px-4 py-2" onClick={() => setStep('draft')}>Back</button>
            <button
              disabled={busy}
              onClick={runCard}
              className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {busy ? 'Building card…' : 'Build card'}
            </button>
          </div>
        </section>
      )}

      {step === 'card' && cardId && (
        <CardEditor cardId={cardId} onPublished={() => router.push(`/business/tasks/${cardId}`)} />
      )}
    </div>
  );
}

function suggestionsFrom(insight?: Insight): TaskCard['suggestions'] {
  if (!insight) return {};
  const source = `Discover: ${insight.title}`;
  const out: TaskCard['suggestions'] = {};
  for (const [field, text] of Object.entries(insight.suggestedFields)) if (text) out[field as CardField] = { text, source };
  return out;
}