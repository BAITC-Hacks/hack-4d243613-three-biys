'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { AgentStep, CardField, Insight, TaskCard } from '@/lib/types';
import { AgentTrace, AiNoticeBanner } from '@/components/domain';
import { useStore } from '@/lib/store';
import { useHydrated } from '../useHydrated';
import { clarify, buildCard } from '@/lib/api-client';
import type { ClarifyResponse } from '@/lib/schemas';
import { rateCard } from '@/lib/rating';
import { CardEditor } from './CardEditor';
import { Button, Input, Textarea } from '@/components/ui';
import { VoiceInterviewPanel } from './VoiceInterviewPanel';

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
          <li key={s} className={s === step ? 'font-semibold' : 'text-muted'}>
            {i + 1}. {s === 'draft' ? 'Draft' : s === 'questions' ? 'AI questions' : 'Card & publish'}
          </li>
        ))}
      </ol>

      {error && <div className="rounded-control bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {step === 'draft' && (
        <section className="space-y-3">
          <h1 className="text-2xl font-extrabold">Describe your need</h1>
          <Textarea
            className="h-40 p-3"
            placeholder="In a few sentences: what hurts and what you want to change"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          {draftVagueness(draft).map((v) => (
            <div key={v.phrase} className="text-xs text-amber-800">Vague: “{v.phrase}” — {v.ask}</div>
          ))}
          <div className="flex gap-3">
            <label className="text-sm">Industry
              <Input className="ml-2" value={industry} onChange={(e) => setIndustry(e.target.value)} />
            </label>
            <label className="text-sm">Topic
              <Input className="ml-2" value={topic} onChange={(e) => setTopic(e.target.value)} />
            </label>
          </div>
          <Button loading={busy} disabled={!draft.trim()}
            onClick={runClarify}
          >
            {busy ? 'Analyzing…' : 'Clarify with AI'}
          </Button>
        </section>
      )}

      {step === 'questions' && (
        <section className="space-y-4">
          <h1 className="text-2xl font-extrabold">AI found gaps in your draft</h1>
          <AiNoticeBanner />
          <VoiceInterviewPanel
            draftText={draft}
            questions={questions}
            onAnswer={(field, answer) => {
              const q = questions.find((x) => x.field === field);
              if (q) setAnswers((a) => ({ ...a, [q.id]: answer }));
            }}
          />
          {trace.length > 0 && (
            <details className="rounded-control border-2 border-border p-3 text-sm">
              <summary className="cursor-pointer text-muted">How the AI works</summary>
              <div className="mt-2"><AgentTrace steps={trace} /></div>
            </details>
          )}
          {questions.map((q) => (
            <div key={q.id} className="space-y-1">
              <div className="font-medium">{q.question}</div>
              <div className="text-xs text-muted">Why: {q.why} · <b>+{q.gain}</b> to {q.field as CardField}</div>
              <Textarea
                className="h-20"
                value={answers[q.id] ?? ''}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              />
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep('draft')}>Back</Button>
            <Button loading={busy}
              onClick={runCard}
            >
              {busy ? 'Building card…' : 'Build card'}
            </Button>
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