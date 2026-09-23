'use client';

import { useRef, useState } from 'react';
import type { CardField, Level, TechSpec } from '@/lib/types';
import { positionPreview, rateCard } from '@/lib/rating';
import { LEVELS } from '@/lib/catalog';
import { useStore } from '@/lib/store';
import {
  LevelUpToast, PositionPreview, RatingPanel, ScoreHistory, SuggestionChip, TechSpecView,
} from '@/components/domain';
import { techSpec as generateTechSpec } from '@/lib/api-client';

const FIELDS: { key: CardField; label: string }[] = [
  { key: 'title', label: 'Title' },
  { key: 'context', label: 'Context' },
  { key: 'need', label: 'Need' },
  { key: 'users', label: 'Users' },
  { key: 'data', label: 'Data & materials' },
  { key: 'constraints', label: 'Constraints' },
  { key: 'expectedResult', label: 'Expected result' },
  { key: 'successCriteria', label: 'Success criteria' },
  { key: 'contact', label: 'Contact & interaction format' },
];

const LIST_KEYS: { key: Exclude<keyof TechSpec, 'summary'>; label: string }[] = [
  { key: 'scope', label: 'Scope' },
  { key: 'dataInputs', label: 'Data inputs' },
  { key: 'functionalRequirements', label: 'Functional requirements' },
  { key: 'nonFunctional', label: 'Non-functional' },
  { key: 'acceptanceCriteria', label: 'Acceptance criteria' },
  { key: 'suggestedStack', label: 'Suggested stack' },
  { key: 'openQuestions', label: 'Open questions' },
];

export function CardEditor({ cardId, onPublished }: { cardId: string; onPublished?: () => void }) {
  const card = useStore((s) => s.cards.find((c) => c.id === cardId));
  const { updateFields, confirmField, acceptSuggestion, setTechSpec, confirmTechSpec, publish } = useStore();
  const [tab, setTab] = useState<'card' | 'tech'>('card');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ from: Level; to: Level } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const cards = useStore((s) => s.cards);
  if (!card) return <div>Card not found.</div>;

  const rating = rateCard(card);
  const preview = positionPreview(card, cards.filter((c) => c.status === 'published'));

  // Level-up moment: compare level before/after the confirm (40 / 70 / 90 thresholds).
  const confirm = (key: CardField, value: boolean) => {
    const from = rating.level;
    confirmField(card.id, key, value);
    const next = useStore.getState().cards.find((c) => c.id === card.id);
    const to = next ? rateCard(next).level : from;
    if (LEVELS.indexOf(to) > LEVELS.indexOf(from)) {
      setToast({ from, to });
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 3500);
    }
  };

  const generate = async () => {
    setBusy(true); setError(null);
    const res = await generateTechSpec({ fields: card.fields });
    setBusy(false);
    if (!res.ok) return setError(res.error.message);
    setTechSpec(card.id, res.data.techSpec, res.data.skillsNeeded);
  };

  const editSpec = (patch: Partial<TechSpec>) =>
    card.techSpec && setTechSpec(card.id, { ...card.techSpec, ...patch }, card.skillsNeeded);

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div className="flex gap-2 border-b border-border">
          {(['card', 'tech'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-2 ${tab === t ? 'border-b-2 border-accent font-semibold' : 'text-muted'}`}
            >
              {t === 'card' ? 'Task card' : 'Tech docs'}
            </button>
          ))}
        </div>

        {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {tab === 'card' && FIELDS.map(({ key, label }) => (
          <div key={key} id={`field-${key}`} className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{label}</span>
              {card.fieldSource[key] && (
                <span className="rounded bg-surface-2 px-1.5 text-xs text-muted">from {card.fieldSource[key]}</span>
              )}
              {!card.fields[key] && <span className="text-xs text-amber-700">not stated</span>}
              <label className="ml-auto flex items-center gap-1 text-xs">
                <input
                  type="checkbox"
                  disabled={!card.fields[key]}
                  checked={!!card.confirmed[key]}
                  onChange={(e) => confirm(key, e.target.checked)}
                />
                confirmed
              </label>
            </div>
            {card.suggestions[key] && (
              <SuggestionChip
                text={card.suggestions[key]!.text}
                source={card.suggestions[key]!.source}
                onAccept={() => acceptSuggestion(card.id, key)}
              />
            )}
            <textarea
              className="h-20 w-full rounded border border-border p-2 text-sm"
              value={card.fields[key] ?? ''}
              onChange={(e) => updateFields(card.id, { [key]: e.target.value || null })}
            />
            {rating.vagueness.filter((v) => v.field === key).map((v) => (
              <div key={v.phrase} className="text-xs text-amber-800">
                Vague: “{v.phrase}” — {v.ask}
              </div>
            ))}
          </div>
        ))}

        {tab === 'tech' && (
          <div className="space-y-4">
            <button
              disabled={busy}
              onClick={generate}
              className="rounded bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
            >
              {busy ? 'Generating…' : card.techSpec ? 'Regenerate tech docs' : 'Generate tech docs'}
            </button>
            {card.techSpec && (
              <>
                <label className="block text-sm font-medium">Summary
                  <textarea
                    className="mt-1 h-20 w-full rounded border border-border p-2 font-normal"
                    value={card.techSpec.summary}
                    onChange={(e) => editSpec({ summary: e.target.value })}
                  />
                </label>
                {LIST_KEYS.map(({ key, label }) => (
                  <label key={key} className="block text-sm font-medium">{label} <span className="text-xs text-muted">(one per line)</span>
                    <textarea
                      className="mt-1 h-24 w-full rounded border border-border p-2 font-normal"
                      value={card.techSpec![key].join('\n')}
                      onChange={(e) => editSpec({ [key]: e.target.value.split('\n') })}
                    />
                  </label>
                ))}
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={card.techSpecConfirmed}
                    onChange={() => confirmTechSpec(card.id)}
                    disabled={card.techSpecConfirmed}
                  />
                  I reviewed and confirm the technical documentation
                </label>
                <details>
                  <summary className="cursor-pointer text-sm text-muted">Preview as students see it</summary>
                  <TechSpecView spec={card.techSpec} />
                </details>
              </>
            )}
          </div>
        )}
      </div>

      <aside className="space-y-4">
        {toast && <div className="fixed right-4 top-4 z-50"><LevelUpToast from={toast.from} to={toast.to} /></div>}
        <PositionPreview preview={preview} />
        <RatingPanel
          rating={rating}
          onAction={(field) => { setTab('card'); setTimeout(() => document.getElementById(`field-${field}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })); }}
        />
        {card.history.length > 1 && <ScoreHistory history={card.history} />}
        {card.status === 'published' ? (
          <div className="rounded bg-accent-soft p-3 text-sm text-[#365314]">Published to the catalog</div>
        ) : (
          <>
            <button
              disabled={!card.fields.title}
              onClick={() => { publish(card.id); onPublished?.(); }}
              className="w-full rounded bg-accent px-4 py-2 font-semibold text-accent-foreground disabled:opacity-50"
            >
              Publish to catalog
            </button>
            {!card.techSpecConfirmed && (
              <p className="text-xs text-muted">Tip: confirm tech docs so students can start faster.</p>
            )}
          </>
        )}
      </aside>
    </div>
  );
}
