'use client';
// AI interview (owner: B, design). Presentational: props only, the page wires the data.
//   <AiInterview open questions={qs} loading={busy} scoreBefore={25} onClose={close} onFinish={(answers) => buildCard(answers)} />
//   questions come from POST /api/ai/clarify, answers go to POST /api/ai/card as { questionId, field, question, answer }[].
//   <InterviewAvatar variant="orb" state="thinking" size={120} />   also usable on its own (loaders, empty states).
// Optional `voice`: Interview mode becomes voice-first (big avatar, round mic button, status caption).
import { Fragment, useEffect, useEffectEvent, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import clsx from 'clsx';
import { ArrowRight, Check, MessagesSquare, Mic, Sparkles, Square, X } from 'lucide-react';
import { Button, IconButton } from '@/components/ui/button';
import { Tabs, type TabItem } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/form';
import type { VoiceStatus } from '@/lib/voice/interview';
import { AiNoticeBanner } from './legal';

export type InterviewQuestion<F extends string = string> = { id: string; field: F; question: string; why: string; gain: number };
export type InterviewAnswer<F extends string = string> = { questionId: string; field: F; question: string; answer: string };
export type InterviewAvatarVariant = 'orb' | 'bot' | 'matrix' | 'biy';
export type InterviewAvatarState = 'idle' | 'thinking' | 'asking' | 'listening';
export type InterviewMode = 'interview' | 'chat';

export type InterviewVoice = {
  status: VoiceStatus;
  onStart: () => void;
  onStop: () => void;
  error?: string;
  /** Question ids or field names already answered by voice: their squares tick in. */
  answered?: string[];
  /** Question the voice agent is asking now (id). Defaults to the first unanswered one. */
  currentId?: string;
};

export type AiInterviewProps<F extends string = string> = {
  open: boolean;
  questions: InterviewQuestion<F>[];
  /** AI is preparing questions: the avatar thinks. */
  loading?: boolean;
  /** Current rating 0-100: shows "25 → 70 if you answer all" and a running score. */
  scoreBefore?: number;
  avatar?: InterviewAvatarVariant;
  initialMode?: InterviewMode;
  /** Voice-first Interview mode (Realtime voice). Without it the Interview mode is typed. */
  voice?: InterviewVoice;
  onClose: () => void;
  /** "Build the card": answered questions only, in question order. */
  onFinish: (answers: InterviewAnswer<F>[]) => void;
};

const THINK_MS = 400;
const ASK_MS = 2400;

const CSS = `
.kpi-fb{transform-box:fill-box;transform-origin:center}
.kpi-orb{background:radial-gradient(circle at 34% 28%,#f7fee7 0%,#d9f99d 20%,#84cc16 58%,#65a30d 100%)}
.kpi-swirl{background:conic-gradient(from 0deg,transparent 0 10%,rgba(255,255,255,.62) 18%,transparent 30%,transparent 48%,rgba(217,249,157,.8) 58%,transparent 72%)}
.kpi-shade{background:radial-gradient(circle at 72% 74%,rgba(54,83,20,.45),transparent 42%)}
.kpi-matrix{--kpi-off:#2e2e33}
.kpi-breathe{animation:kpi-breathe 4.2s ease-in-out infinite}
.kpi-spin{animation:kpi-spin 9s linear infinite}
.kpi-spin-rev{animation:kpi-spin 14s linear infinite reverse}
.kpi-ripple{animation:kpi-ripple 1.9s cubic-bezier(.2,.6,.35,1) infinite}
.kpi-tap{animation:kpi-tap .5s ease-out both}
.kpi-blink{animation:kpi-blink 4.4s ease-in-out infinite}
.kpi-eq{animation:kpi-eq .7s ease-in-out infinite}
.kpi-dot{animation:kpi-dot 1s ease-in-out infinite}
.kpi-nod{animation:kpi-nod 1.6s ease-in-out infinite}
.kpi-glance{animation:kpi-glance 2.4s ease-in-out infinite}
.kpi-mouth{animation:kpi-mouth .36s ease-in-out infinite}
.kpi-led{animation:kpi-led .9s steps(2,jump-none) infinite}
.kpi-cell{animation:kpi-cell 1.4s ease-in-out infinite}
.kpi-comet{animation:kpi-comet 1.2s linear infinite}
.kpi-flash{animation:kpi-flash .6s ease-out both}
.kpi-rise{animation:kpi-rise .34s cubic-bezier(.2,.8,.2,1) both}
.kpi-in{animation:kpi-in .26s cubic-bezier(.2,.8,.2,1) both}
.kpi-fade{animation:kpi-fade .2s ease-out both}
.kpi-pop{animation:kpi-pop .42s cubic-bezier(.3,1.6,.5,1) both}
.kpi-float{animation:kpi-float 1.3s ease-out both}
@keyframes kpi-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
@keyframes kpi-spin{to{transform:rotate(360deg)}}
@keyframes kpi-ripple{0%{transform:scale(1);opacity:.85}100%{transform:scale(1.42);opacity:0}}
@keyframes kpi-tap{0%{transform:scale(.96);opacity:.9}100%{transform:scale(1.22);opacity:0}}
@keyframes kpi-blink{0%,90%,100%{transform:scaleY(1)}94%{transform:scaleY(.1)}}
@keyframes kpi-eq{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}
@keyframes kpi-dot{0%,100%{opacity:.3;transform:translateY(0)}40%{opacity:1;transform:translateY(-4px)}}
@keyframes kpi-nod{0%,100%{transform:rotate(0) translateY(0)}30%{transform:rotate(-2.5deg) translateY(1px)}65%{transform:rotate(2deg) translateY(-1px)}}
@keyframes kpi-glance{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}65%{transform:translateX(3px)}}
@keyframes kpi-mouth{0%,100%{transform:scaleY(.4)}50%{transform:scaleY(1.6)}}
@keyframes kpi-led{50%{opacity:.25}}
@keyframes kpi-cell{0%,100%{background-color:var(--kpi-off);box-shadow:none}50%{background-color:var(--accent);box-shadow:0 0 6px var(--accent)}}
@keyframes kpi-comet{0%,6%{background-color:var(--accent);box-shadow:0 0 6px var(--accent)}45%,100%{background-color:var(--kpi-off);box-shadow:none}}
@keyframes kpi-flash{0%{opacity:1}100%{opacity:0}}
@keyframes kpi-rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes kpi-in{from{opacity:0;transform:translateY(16px) scale(.985)}to{opacity:1;transform:none}}
@keyframes kpi-fade{from{opacity:0}to{opacity:1}}
@keyframes kpi-pop{0%{transform:scale(1)}45%{transform:scale(1.22)}100%{transform:scale(1)}}
@keyframes kpi-float{0%{opacity:0;transform:translateY(6px)}15%{opacity:1}100%{opacity:0;transform:translateY(-22px)}}
@media (prefers-reduced-motion:reduce){.kpi-m,.kpi-m *{animation:none!important;transition:none!important}.kpi-rm-hide{display:none!important}}
`;

/** Keyframes for the interview. React 19 hoists it to <head> once (deduplicated by href). */
function InterviewStyles() {
  return (
    <style href="kopir-ai-interview" precedence="medium">
      {CSS}
    </style>
  );
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  context: 'Context',
  need: 'Need',
  users: 'Users',
  data: 'Data & materials',
  constraints: 'Constraints',
  expectedResult: 'Expected result',
  successCriteria: 'Success criteria',
  contact: 'Contact & format',
};

function fieldLabel(field: string) {
  return FIELD_LABELS[field] ?? field.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}

const HATCH = 'bg-surface-2 bg-[repeating-linear-gradient(135deg,var(--muted)_0_1.5px,transparent_1.5px_4px)]';

// ---------------------------------------------------------------------------------------------
// Avatars
// ---------------------------------------------------------------------------------------------

export type InterviewAvatarProps = {
  variant?: InterviewAvatarVariant;
  state?: InterviewAvatarState;
  /** Pixel size of the square box. */
  size?: number;
  /** Keystroke counter: each change makes a quick pulse while listening. */
  pulse?: number;
  /** Accessible name. Without it the avatar is decorative (aria-hidden). */
  label?: string;
  className?: string;
};

export function InterviewAvatar({ variant = 'orb', state = 'idle', size = 120, pulse = 0, label, className }: InterviewAvatarProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!pulse || state !== 'listening') return;
    const el = ref.current;
    if (!el || typeof el.animate !== 'function') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.045)' }, { transform: 'scale(1)' }], {
      duration: 200,
      easing: 'ease-out',
    });
  }, [pulse, state]);

  return (
    <div
      ref={ref}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      data-state={state}
      className={clsx('kpi-m relative inline-grid shrink-0 place-items-center', className)}
      style={{ width: size, height: size }}
    >
      <InterviewStyles />
      {variant === 'bot' ? (
        <Bot state={state} />
      ) : variant === 'matrix' ? (
        <Matrix state={state} pulse={pulse} size={size} />
      ) : variant === 'biy' ? (
        <Biy state={state} />
      ) : (
        <Orb state={state} pulse={pulse} size={size} />
      )}
    </div>
  );
}

function Orb({ state, pulse, size }: { state: InterviewAvatarState; pulse: number; size: number }) {
  const gap = Math.max(2, Math.round(size * 0.05));
  const inset = gap + 2;
  const swirl = state === 'thinking' ? '1.3s' : state === 'listening' ? '3.5s' : state === 'asking' ? '5s' : '9s';
  return (
    <>
      <span
        className={clsx(
          'absolute inset-0 rounded-full border-2',
          state === 'thinking' ? 'kpi-spin border-dashed border-foreground' : state === 'listening' ? 'border-accent-strong' : 'border-foreground',
        )}
        style={state === 'thinking' ? { animationDuration: '5s' } : undefined}
      />
      {state === 'asking' ? (
        <>
          <span className="kpi-ripple kpi-rm-hide absolute rounded-full border-2 border-accent" style={{ inset }} />
          <span className="kpi-ripple kpi-rm-hide absolute rounded-full border-2 border-accent" style={{ inset, animationDelay: '-0.95s' }} />
        </>
      ) : null}
      {state === 'listening' && pulse > 0 ? (
        <span key={pulse} className="kpi-tap kpi-rm-hide absolute rounded-full border-2 border-accent" style={{ inset }} />
      ) : null}
      <span
        className={clsx(
          'kpi-orb absolute overflow-hidden rounded-full transition-[scale] duration-300',
          state === 'idle' && 'kpi-breathe',
          state === 'thinking' && 'scale-[.94]',
          state === 'listening' && 'scale-[1.02]',
        )}
        style={{
          inset,
          boxShadow: `0 0 ${Math.round(size * 0.22)}px color-mix(in srgb, var(--accent) 55%, transparent), inset ${-size * 0.05}px ${-size * 0.07}px ${size * 0.14}px rgba(54,83,20,.4)`,
        }}
      >
        <span className="kpi-swirl kpi-spin absolute -inset-1/4 rounded-full" style={{ animationDuration: swirl, filter: `blur(${size * 0.045}px)` }} />
        <span className="kpi-shade kpi-spin-rev absolute -inset-1/4 rounded-full" />
        <span
          className="absolute rounded-full bg-white/70"
          style={{ left: '17%', top: '13%', width: '36%', height: '26%', filter: `blur(${size * 0.04}px)`, transform: 'rotate(-24deg)' }}
        />
      </span>
    </>
  );
}

function Bot({ state }: { state: InterviewAvatarState }) {
  const look = state === 'listening' ? 'translate(0px,5px)' : state === 'thinking' ? 'translate(4px,-4px)' : 'translate(0px,0px)';
  const ink = 'var(--foreground)';
  const lime = 'var(--accent)';
  return (
    <svg viewBox="0 0 120 120" className="size-full overflow-visible" fill="none">
      <g className={clsx('kpi-fb', state === 'asking' && 'kpi-nod')} style={{ transformOrigin: '50% 90%' }}>
        <path d="M60 14V26" stroke={ink} strokeWidth={3} />
        <rect x={54} y={4} width={12} height={12} fill={lime} stroke={ink} strokeWidth={2} className={state === 'thinking' ? 'kpi-led' : undefined} />
        <rect x={24} y={32} width={84} height={74} fill={lime} />
        <rect x={10} y={52} width={8} height={26} fill={ink} />
        <rect x={102} y={52} width={8} height={26} fill={ink} />
        <rect x={18} y={26} width={84} height={74} fill={ink} />
        <rect x={27} y={35} width={66} height={56} fill="#27272a" stroke="#3f3f46" strokeWidth={2} />
        <g style={{ transform: look, transition: 'transform 260ms ease' }}>
          <g className={state === 'thinking' ? 'kpi-glance' : undefined}>
            <g className="kpi-blink kpi-fb" style={{ filter: 'drop-shadow(0 0 4px var(--accent))' }}>
              <rect x={37} y={47} width={14} height={14} fill={lime} />
              <rect x={69} y={47} width={14} height={14} fill={lime} />
            </g>
          </g>
        </g>
        {state === 'asking' ? (
          [0, 1, 2, 3, 4].map((i) => (
            <rect
              key={i}
              x={43 + i * 7}
              y={67}
              width={5}
              height={18}
              fill={lime}
              className="kpi-eq kpi-fb"
              style={{ animationDelay: `${-i * 0.13}s`, animationDuration: `${0.6 + (i % 3) * 0.12}s` }}
            />
          ))
        ) : state === 'thinking' ? (
          [0, 1, 2].map((i) => (
            <rect key={i} x={47 + i * 10} y={73} width={6} height={6} fill={lime} className="kpi-dot" style={{ animationDelay: `${i * 0.16}s` }} />
          ))
        ) : state === 'listening' ? (
          <rect x={52} y={73} width={16} height={6} fill={lime} />
        ) : (
          <rect x={44} y={74} width={32} height={4} fill={lime} />
        )}
      </g>
    </svg>
  );
}

/** Deterministic pseudo-random 0..1 (pure: same input, same output). */
function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

type CellPlan = { lit: boolean; anim?: 'kpi-cell' | 'kpi-comet'; dur?: number; offset?: number };

function planCell(state: InterviewAvatarState, r: number, c: number): CellPlan {
  const i = r * 7 + c;
  const dr = r - 3;
  const dc = c - 3;
  const d = Math.max(Math.abs(dr), Math.abs(dc));
  switch (state) {
    case 'thinking': {
      if (d === 0) return { lit: true };
      if (d !== 2) return { lit: false };
      const frac = ((Math.atan2(dr, dc) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2);
      return { lit: true, anim: 'kpi-comet', dur: 1.1, offset: frac * 1.1 };
    }
    case 'asking':
      return { lit: d === 0 || d === 2, anim: 'kpi-comet', dur: 1.5, offset: d * 0.18 };
    case 'listening': {
      const h = hash(i);
      return h < 0.5 ? { lit: h < 0.16, anim: 'kpi-cell', dur: 0.8 + hash(i + 49) * 1.2, offset: hash(i + 98) * 0.8 } : { lit: false };
    }
    default:
      return { lit: r + c === 6, anim: 'kpi-comet', dur: 3.6, offset: (r + c) * 0.16 };
  }
}

function Matrix({ state, pulse, size }: { state: InterviewAvatarState; pulse: number; size: number }) {
  const shadow = Math.max(2, Math.round(size * 0.05));
  const cells: ReactNode[] = [];
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const i = r * 7 + c;
      const plan = planCell(state, r, c);
      const flash = state === 'listening' && pulse > 0 && hash(i * 3.7 + pulse * 17.3) < 0.15;
      cells.push(
        <span
          key={i}
          className={clsx('relative', plan.anim)}
          style={{
            backgroundColor: plan.lit ? 'var(--accent)' : 'var(--kpi-off)',
            boxShadow: plan.lit ? '0 0 4px var(--accent)' : undefined,
            animationDuration: plan.dur ? `${plan.dur}s` : undefined,
            animationDelay: plan.dur !== undefined && plan.offset !== undefined ? `${(plan.offset - plan.dur).toFixed(3)}s` : undefined,
          }}
        >
          {flash ? <span key={pulse} className="kpi-flash kpi-rm-hide absolute inset-0 bg-accent" style={{ boxShadow: '0 0 6px var(--accent)' }} /> : null}
        </span>,
      );
    }
  }
  return (
    <div
      className="kpi-matrix grid size-full grid-cols-7 grid-rows-7 border-2 border-border bg-foreground"
      style={{ padding: Math.max(2, size * 0.08), gap: Math.max(1, size * 0.022), boxShadow: `${shadow}px ${shadow}px 0 var(--accent)` }}
    >
      {cells}
    </div>
  );
}

const BIY = {
  crown: 'M37 55 L51 13 Q60 3 69 13 L83 55 Z',
  brim: 'M27 43 L56 46 L60 52 L64 46 L93 43 L91 57 H29 Z',
  face: 'M36 56 H84 V98 H36 Z',
  beard: 'M36 88 L46 93 H74 L84 88 L80 104 L60 116 L40 104 Z',
  mustache: 'M45 88 Q52 83 60 86 Q68 83 75 88 L75 91 Q68 88 60 90 Q52 88 45 91 Z',
};

function Biy({ state }: { state: InterviewAvatarState }) {
  const ink = 'var(--foreground)';
  const lime = 'var(--accent)';
  const paper = 'var(--surface)';
  const skin = 'var(--surface-2)';
  const look = state === 'listening' ? 'translate(0px,2.5px)' : state === 'thinking' ? 'translate(0px,-1.5px)' : 'translate(0px,0px)';
  return (
    <svg viewBox="0 0 120 120" className="size-full overflow-visible" fill="none" strokeLinejoin="round">
      <g className="kpi-fb" style={{ transformOrigin: '50% 100%', transform: state === 'listening' ? 'rotate(3deg)' : 'rotate(0deg)', transition: 'transform 300ms ease' }}>
        <g className={clsx('kpi-fb', state === 'asking' ? 'kpi-nod' : state === 'idle' && 'kpi-breathe')} style={{ transformOrigin: '50% 100%' }}>
          {/* hard offset shadow */}
          <g transform="translate(5 5)" fill={lime}>
            <path d={BIY.crown} />
            <path d={BIY.brim} />
            <path d={BIY.face} />
            <path d={BIY.beard} />
          </g>
          {/* kalpak: white felt crown, graphite upturned brim split at the front */}
          <path d={BIY.crown} fill={paper} stroke={ink} strokeWidth={2} />
          <path d="M52 38 q4 -6 8 0 q4 -6 8 0" stroke={ink} strokeWidth={1.5} strokeLinecap="round" />
          <rect x={56.5} y={1.5} width={7} height={7} fill={lime} stroke={ink} strokeWidth={2} className={state === 'thinking' ? 'kpi-led' : undefined} />
          <path d={BIY.brim} fill={ink} stroke={ink} strokeWidth={2} />
          {/* face */}
          <rect x={31} y={68} width={5} height={13} fill={skin} stroke={ink} strokeWidth={2} />
          <rect x={84} y={68} width={5} height={13} fill={skin} stroke={ink} strokeWidth={2} />
          <path d={BIY.face} fill={skin} stroke={ink} strokeWidth={2} />
          <g style={{ transform: state === 'asking' ? 'translateY(-1.5px)' : 'translateY(0px)', transition: 'transform 200ms ease' }}>
            <rect x={42} y={61} width={13} height={3} fill={ink} />
            <rect x={65} y={61} width={13} height={3} fill={ink} />
          </g>
          <g style={{ transform: look, transition: 'transform 260ms ease' }}>
            <g className={state === 'thinking' ? 'kpi-glance' : undefined}>
              <g className="kpi-blink kpi-fb">
                <rect x={44} y={68} width={9} height={9} fill={ink} />
                <rect x={46.5} y={70.5} width={4} height={4} fill={lime} />
                <rect x={67} y={68} width={9} height={9} fill={ink} />
                <rect x={69.5} y={70.5} width={4} height={4} fill={lime} />
              </g>
            </g>
          </g>
          <path d="M60 74 V82 H56" stroke={ink} strokeWidth={2} />
          {/* short beard and mustache */}
          <path d={BIY.beard} fill={ink} stroke={ink} strokeWidth={2} />
          <path d={BIY.mustache} fill={ink} />
          <rect x={54} y={96} width={12} height={2.5} fill={paper} className={clsx('kpi-fb', state === 'asking' && 'kpi-mouth')} />
        </g>
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------------------------
// Small parts
// ---------------------------------------------------------------------------------------------

function To() {
  return (
    <>
      <ArrowRight aria-hidden="true" className="mx-1 inline size-3.5 align-[-2px]" />
      <span className="sr-only"> to </span>
    </>
  );
}

function GainChip({ gain, why, compact = false }: { gain: number; why?: string; compact?: boolean }) {
  return (
    <p
      className={clsx(
        'inline-flex max-w-full items-baseline gap-2 border-2 border-border bg-accent-soft text-left text-[#365314]',
        compact ? 'mt-2.5 px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
      )}
    >
      <span className="shrink-0 font-display font-extrabold text-foreground tabular-nums">+{gain} pts</span>
      {why ? (
        <>
          <span aria-hidden="true">·</span>
          <span className="min-w-0">{why}</span>
        </>
      ) : null}
    </p>
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="border-2 border-border bg-surface-2 px-1 font-sans text-[11px] leading-4 font-bold text-foreground">{children}</kbd>;
}

function SendHint() {
  return (
    <p className="hidden items-center gap-1 text-xs text-muted sm:flex">
      <Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd>
      <span className="ml-1">to send</span>
    </p>
  );
}

const MODE_TABS: TabItem<InterviewMode>[] = [
  {
    id: 'interview',
    label: (
      <>
        <Sparkles aria-hidden="true" className="size-4" />
        Interview
      </>
    ),
  },
  {
    id: 'chat',
    label: (
      <>
        <MessagesSquare aria-hidden="true" className="size-4" />
        Chat
      </>
    ),
  },
];

type Status = 'answered' | 'skipped' | 'pending';

function ProgressSquares({
  items,
  current,
  disabled,
  onJump,
}: {
  items: { id: string; field: string; status: Status }[];
  current: number;
  disabled: boolean;
  onJump: (i: number) => void;
}) {
  return (
    <ol aria-label="Questions" className="flex flex-wrap items-center">
      {items.map((q, i) => {
        const isCurrent = i === current;
        return (
          <li key={q.id}>
            <button
              type="button"
              onClick={() => onJump(i)}
              disabled={disabled}
              title={fieldLabel(q.field)}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={`Question ${i + 1}, ${fieldLabel(q.field)}: ${q.status}${isCurrent ? ', current' : ''}`}
              className="group grid size-6 cursor-pointer place-items-center focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:outline-hidden disabled:cursor-default"
            >
              <span
                className={clsx(
                  'block size-3.5 border-2 border-border transition-[background-color,scale] duration-200 group-hover:scale-110',
                  isCurrent ? 'scale-110 bg-foreground' : q.status === 'answered' ? 'bg-accent' : q.status === 'skipped' ? HATCH : 'bg-surface',
                )}
              />
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function ScoreStrip({
  base,
  gained,
  totalGain,
  flash,
  onFinishEarly,
}: {
  base?: number;
  gained: number;
  totalGain: number;
  flash: { id: number; gain: number } | null;
  onFinishEarly?: () => void;
}) {
  const hasScore = base !== undefined;
  const now = hasScore ? Math.min(100, base + gained) : gained;
  const potential = hasScore ? Math.min(100, base + totalGain) : totalGain;
  const max = hasScore ? 100 : Math.max(1, totalGain);
  const pct = (v: number) => `${Math.min(100, Math.max(0, (v / max) * 100))}%`;
  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        <p className="text-[11px] font-extrabold tracking-[0.12em] text-muted uppercase">{hasScore ? 'Rating' : 'Points'}</p>
        <p className="mt-0.5 font-display text-xl leading-none font-extrabold tabular-nums">
          {hasScore ? (
            <>
              {base}
              <To />
              <span key={now} className="kpi-pop inline-block">
                {now}
              </span>
            </>
          ) : (
            <>
              <span key={now} className="kpi-pop inline-block">
                +{now}
              </span>
              <span className="text-sm text-muted"> / {totalGain}</span>
            </>
          )}
        </p>
        {flash ? (
          <span
            key={flash.id}
            aria-hidden="true"
            className="kpi-float kpi-rm-hide pointer-events-none absolute -top-3 right-0 border-2 border-border bg-accent px-1 font-display text-xs font-extrabold"
          >
            +{flash.gain}
          </span>
        ) : null}
      </div>
      <div
        role="progressbar"
        aria-label={hasScore ? 'Card rating' : 'Points earned'}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={now}
        aria-valuetext={hasScore ? `${now} of 100, ${potential} if you answer all` : `${now} of ${totalGain} points`}
        className="relative h-5 min-w-0 flex-1 overflow-hidden border-2 border-border bg-surface"
      >
        <span
          className="absolute inset-y-0 left-0 bg-accent-soft bg-[repeating-linear-gradient(135deg,color-mix(in_srgb,var(--accent)_35%,transparent)_0_2px,transparent_2px_6px)] transition-[width] duration-500"
          style={{ width: pct(potential) }}
        />
        <span className="absolute inset-y-0 left-0 bg-accent transition-[width] duration-700 ease-[cubic-bezier(.2,.8,.2,1)]" style={{ width: pct(now) }} />
        {hasScore ? <span className="absolute inset-y-0 left-0 bg-foreground" style={{ width: pct(base) }} /> : null}
      </div>
      {onFinishEarly ? (
        <button
          type="button"
          onClick={onFinishEarly}
          className="hidden shrink-0 cursor-pointer text-xs font-semibold underline decoration-accent decoration-2 underline-offset-4 hover:bg-accent-soft focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:outline-hidden sm:inline"
        >
          Finish early
        </button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// AiInterview
// ---------------------------------------------------------------------------------------------

const VOICE_CAPTION: Record<VoiceStatus, string> = {
  idle: 'Press the button and answer out loud',
  connecting: 'Connecting…',
  listening: 'Listening…',
  speaking: 'AI is speaking',
  error: 'Voice is unavailable',
  finished: 'Voice interview finished',
};

function voiceAvatarState(status: VoiceStatus): InterviewAvatarState {
  if (status === 'connecting') return 'thinking';
  if (status === 'listening') return 'listening';
  if (status === 'speaking') return 'asking';
  return 'idle';
}

/** Pop-up AI interview for the Clarify step. State resets when a new set of questions arrives. */
export function AiInterview<F extends string = string>(props: AiInterviewProps<F>) {
  const sessionKey = props.questions.map((q) => q.id).join('|');
  return <InterviewSession key={sessionKey} {...props} />;
}

function InterviewSession<F extends string>({
  open,
  questions,
  loading = false,
  scoreBefore,
  avatar = 'orb',
  initialMode = 'interview',
  voice,
  onClose,
  onFinish,
}: AiInterviewProps<F>) {
  const titleId = useId();
  const inputId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const finishRef = useRef<HTMLButtonElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<InterviewMode>(initialMode);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [skipped, setSkipped] = useState<Record<string, boolean>>({});
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<number | null>(null);
  const [speaking, setSpeaking] = useState(true);
  const [keys, setKeys] = useState(0);
  const [flash, setFlash] = useState<{ id: number; gain: number } | null>(null);

  const total = questions.length;
  const thinking = pending !== null;
  const finished = total > 0 && index >= total;
  const current = finished ? undefined : questions[index];
  const voiceAnswered = new Set(voice?.answered ?? []);
  const isAnswered = (q: InterviewQuestion<F>) => Boolean(answers[q.id]) || voiceAnswered.has(q.id) || voiceAnswered.has(q.field);
  const statusOf = (q: InterviewQuestion<F>): Status => (isAnswered(q) ? 'answered' : skipped[q.id] ? 'skipped' : 'pending');
  const answeredCount = questions.filter(isAnswered).length;
  const skippedCount = questions.filter((q) => statusOf(q) === 'skipped').length;
  const gained = questions.reduce((sum, q) => sum + (isAnswered(q) ? q.gain : 0), 0);
  const totalGain = questions.reduce((sum, q) => sum + q.gain, 0);
  const base = scoreBefore === undefined ? undefined : Math.min(100, Math.max(0, Math.round(scoreBefore)));
  const potential = base === undefined ? undefined : Math.min(100, base + totalGain);
  const voiceFirst = Boolean(voice) && mode === 'interview';

  const avatarState: InterviewAvatarState =
    (loading && total === 0) || thinking
      ? 'thinking'
      : finished || total === 0
        ? 'idle'
        : draft.trim()
          ? 'listening'
          : speaking
            ? 'asking'
            : 'idle';

  // After an answer: think briefly, then ask the next question.
  useEffect(() => {
    if (pending === null) return;
    const t = window.setTimeout(() => {
      setIndex(pending);
      setPending(null);
      setSpeaking(true);
    }, THINK_MS);
    return () => window.clearTimeout(t);
  }, [pending]);

  // "Asking" lasts a moment, then the avatar settles.
  useEffect(() => {
    if (!open || !speaking) return;
    const t = window.setTimeout(() => setSpeaking(false), ASK_MS);
    return () => window.clearTimeout(t);
  }, [open, speaking, index]);

  // Escape closes, the page behind does not scroll, focus returns where it was.
  const closeFromKeyboard = useEffectEvent(() => onClose());
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        e.preventDefault();
        closeFromKeyboard();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open]);

  // Focus the answer box on every question (not when a keyboard user is moving between the tabs).
  useEffect(() => {
    if (!open || thinking) return;
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.getAttribute('role') === 'tab' && active.matches(':focus-visible')) return;
    const input = inputRef.current;
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    } else if (finishRef.current) {
      finishRef.current.focus();
    } else {
      dialogRef.current?.focus();
    }
  }, [open, index, mode, thinking, finished, total]);

  // Chat: keep the latest message in view.
  useEffect(() => {
    if (!open || mode !== 'chat') return;
    const log = logRef.current;
    if (!log) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    log.scrollTo({ top: log.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  }, [open, mode, index, thinking, answeredCount, skippedCount]);

  function advance(nextAnswers: Record<string, string>, nextSkipped: Record<string, boolean>) {
    const done = (q: InterviewQuestion<F>) => Boolean(nextAnswers[q.id] || nextSkipped[q.id]);
    let next = questions.findIndex((q, i) => i > index && !done(q));
    if (next === -1) next = questions.findIndex((q) => !done(q));
    setAnswers(nextAnswers);
    setSkipped(nextSkipped);
    setDraft('');
    setSpeaking(false);
    setPending(next === -1 ? total : next);
  }

  function submit() {
    if (!current || thinking) return;
    const text = draft.trim();
    if (!text) return;
    const nextSkipped = { ...skipped };
    delete nextSkipped[current.id];
    if (!answers[current.id]) {
      const gain = current.gain;
      setFlash((f) => ({ id: (f?.id ?? 0) + 1, gain }));
    }
    advance({ ...answers, [current.id]: text }, nextSkipped);
  }

  function skip() {
    if (!current || thinking) return;
    advance(answers, answers[current.id] ? skipped : { ...skipped, [current.id]: true });
  }

  function goTo(i: number) {
    if (thinking) return;
    const q = questions[i];
    if (!q) return;
    setIndex(i);
    setDraft(answers[q.id] ?? '');
    setSpeaking(true);
  }

  function finishEarly() {
    if (thinking) return;
    setIndex(total);
    setDraft('');
  }

  function build() {
    onFinish(
      questions
        .filter((q) => answers[q.id])
        .map((q) => ({ questionId: q.id, field: q.field, question: q.question, answer: answers[q.id] })),
    );
  }

  function backToQuestions() {
    const firstOpen = questions.findIndex((q) => !answers[q.id]);
    goTo(firstOpen === -1 ? 0 : firstOpen);
  }

  function onDraftKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submit();
    }
  }

  function trapFocus(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Tab') return;
    const root = dialogRef.current;
    if (!root) return;
    const items = Array.from(
      root.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])'),
    ).filter((el) => el.offsetParent !== null);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === root)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  if (!open) return null;

  const announcement =
    loading && total === 0
      ? 'Preparing questions'
      : finished
        ? `Interview complete. ${answeredCount} of ${total} answered.`
        : current && !thinking
          ? `Question ${index + 1} of ${total}. ${current.question}`
          : '';

  const progressLabel = total === 0 ? (loading ? 'Preparing' : 'No questions') : finished ? 'Complete' : `Question ${index + 1} of ${total}`;
  const squares = questions.map((q) => ({ id: q.id, field: q.field, status: statusOf(q) }));
  const doneItems = questions
    .map((q, i) => ({ q, i }))
    .filter(({ q, i }) => (answers[q.id] || skipped[q.id]) && (i !== index || thinking));

  const tabs = (fullWidth: boolean) => (
    <Tabs items={MODE_TABS} value={mode} onChange={setMode} aria-label="Interview mode" fullWidth={fullWidth} />
  );

  // Voice-first mode: current question = the one the agent asks, or the first not yet answered.
  const voiceCurrent = voice ? (questions.find((q) => q.id === voice.currentId) ?? questions.find((q) => !isAnswered(q))) : undefined;
  const voiceActive = voice ? voice.status === 'connecting' || voice.status === 'listening' || voice.status === 'speaking' : false;

  let body: ReactNode;
  if (loading && total === 0) {
    body = (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10 text-center">
        <InterviewAvatar variant={avatar} state="thinking" size={120} />
        <div className="kpi-rise grid gap-2">
          <h3 className="text-2xl font-extrabold text-balance">Reading your draft</h3>
          <p className="max-w-sm text-sm text-muted">The AI looks for gaps that cost rating points and prepares a few short questions.</p>
        </div>
        <div aria-hidden="true" className="grid w-full max-w-sm gap-2">
          <span className="h-3 w-full animate-pulse bg-surface-2" />
          <span className="h-3 w-4/5 animate-pulse bg-surface-2" />
          <span className="h-3 w-3/5 animate-pulse bg-surface-2" />
        </div>
      </div>
    );
  } else if (total === 0) {
    body = (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10 text-center">
        <InterviewAvatar variant={avatar} state="idle" size={120} />
        <div className="grid gap-2">
          <h3 className="text-2xl font-extrabold text-balance">No questions needed</h3>
          <p className="max-w-sm text-sm text-muted">Your draft already covers the key fields.</p>
        </div>
        <Button ref={finishRef} size="lg" onClick={() => onFinish([])}>
          Build the card
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    );
  } else if (finished) {
    body = (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="my-auto flex flex-col items-center gap-6 px-5 py-8 text-center sm:px-10">
          <InterviewAvatar variant={avatar} state="idle" size={128} />
          <div className="kpi-rise grid gap-2">
            <p className="text-xs font-extrabold tracking-[0.14em] text-muted uppercase">Done</p>
            <h3 className="text-3xl leading-tight font-extrabold text-balance">Interview complete</h3>
            <p className="text-muted">
              {answeredCount} of {total} answered · <span className="font-bold text-foreground">+{gained} points</span>
            </p>
          </div>
          <ul className="kpi-rise w-full border-2 border-border text-left" style={{ animationDelay: '80ms' }}>
            {questions.map((q, i) =>
              isAnswered(q) ? (
                <li key={q.id} className="flex items-start gap-3 border-b-2 border-hairline px-4 py-3 last:border-b-0">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center border-2 border-border bg-accent">
                    <Check aria-hidden="true" strokeWidth={3.5} className="size-3" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{fieldLabel(q.field)}</span>
                    <span className="block truncate text-sm text-muted">{answers[q.id] ?? 'Answered by voice'}</span>
                  </span>
                  <span className="shrink-0 font-display text-sm font-extrabold tabular-nums">+{q.gain}</span>
                </li>
              ) : (
                <li key={q.id} className="flex items-center gap-3 border-b-2 border-hairline px-4 py-3 last:border-b-0">
                  <span aria-hidden="true" className={clsx('size-5 shrink-0 border-2 border-border', HATCH)} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-muted">{fieldLabel(q.field)}</span>
                    <span className="block text-xs text-muted">Skipped · +{q.gain} pts still available</span>
                  </span>
                  <Button variant="secondary" size="sm" onClick={() => goTo(i)}>
                    Answer
                  </Button>
                </li>
              ),
            )}
          </ul>
          <div className="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" size="lg" onClick={backToQuestions}>
              Back to questions
            </Button>
            <Button ref={finishRef} size="lg" onClick={build}>
              Build the card
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>
    );
  } else if (voiceFirst && voice) {
    const vState = voiceAvatarState(voice.status);
    body = (
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="my-auto flex flex-col items-center gap-6 px-5 py-8 text-center sm:px-10">
          <InterviewAvatar variant={avatar} state={vState} size={148} />
          <p aria-live="polite" className="flex items-center gap-2 text-xs font-extrabold tracking-[0.14em] text-muted uppercase">
            {voiceActive ? <span aria-hidden="true" className="led" /> : null}
            {VOICE_CAPTION[voice.status]}
          </p>
          {voiceCurrent ? (
            <div key={voiceCurrent.id} className="kpi-rise grid justify-items-center gap-4">
              <p className="text-xs font-extrabold tracking-[0.14em] text-muted uppercase">{fieldLabel(voiceCurrent.field)}</p>
              <h3 className="max-w-[32ch] text-2xl leading-tight font-extrabold text-balance">{voiceCurrent.question}</h3>
              <GainChip gain={voiceCurrent.gain} why={voiceCurrent.why} />
            </div>
          ) : null}
          {voice.status === 'error' ? (
            <p role="alert" className="border-2 border-danger px-3 py-2 text-sm text-danger">
              {voice.error ?? 'Could not start the voice interview.'} You can answer in the text chat.
            </p>
          ) : null}
          <button
            type="button"
            onClick={voiceActive ? voice.onStop : voice.onStart}
            aria-pressed={voiceActive}
            className={clsx(
              'group relative grid size-24 cursor-pointer place-items-center rounded-full border-2 border-border shadow-[4px_4px_0_var(--accent)]',
              'transition-[background-color,translate,box-shadow] duration-150 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
              'focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:ring-offset-4 focus-visible:outline-hidden',
              voiceActive ? 'bg-surface text-foreground hover:bg-accent-soft' : 'bg-primary text-primary-foreground hover:bg-[#27272a]',
            )}
          >
            {voiceActive ? <Square aria-hidden="true" className="size-7 fill-current" /> : <Mic aria-hidden="true" className="size-9" />}
            <span aria-hidden="true" className="led absolute top-3 right-3" />
            <span className="sr-only">{voiceActive ? 'Stop' : 'Start voice interview'}</span>
          </button>
          <p className="-mt-2 text-sm font-bold">{voiceActive ? 'Stop' : 'Start voice interview'}</p>
          <Button variant="secondary" onClick={() => setMode('chat')}>
            <MessagesSquare aria-hidden="true" />
            Switch to text chat
          </Button>
        </div>
      </div>
    );
  } else if (mode === 'interview' && current) {
    body = (
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className="my-auto flex flex-col items-center gap-6 px-5 py-8 text-center sm:px-10">
            <InterviewAvatar variant={avatar} state={avatarState} size={120} pulse={keys} />
            <div key={current.id} className={clsx('kpi-rise grid justify-items-center gap-4 transition-opacity duration-200', thinking && 'opacity-40')}>
              <p className="text-xs font-extrabold tracking-[0.14em] text-muted uppercase">{fieldLabel(current.field)}</p>
              <h3 className="max-w-[32ch] text-2xl leading-tight font-extrabold text-balance sm:text-[1.75rem]">{current.question}</h3>
              <GainChip gain={current.gain} why={current.why} />
            </div>
          </div>
        </div>
        <div className="shrink-0 px-5 pb-6 sm:px-10">
          <Textarea
            ref={inputRef}
            id={inputId}
            aria-label="Your answer"
            rows={3}
            autoFocus
            readOnly={thinking}
            value={draft}
            placeholder="Type your answer…"
            onChange={(e) => {
              setDraft(e.target.value);
              setKeys((k) => k + 1);
            }}
            onKeyDown={onDraftKeyDown}
            className="min-h-0 resize-none text-base"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <SendHint />
            <div className="ml-auto flex gap-2">
              <Button type="button" variant="ghost" size="lg" onClick={skip} disabled={thinking}>
                Skip
              </Button>
              <Button type="submit" size="lg" disabled={!draft.trim() || thinking}>
                Answer
              </Button>
            </div>
          </div>
        </div>
      </form>
    );
  } else {
    body = (
      <div className="flex min-h-0 flex-1 flex-col">
        <div ref={logRef} role="log" aria-label="Interview so far" className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
          <ol className="grid gap-5">
            {doneItems.map(({ q, i }) => (
              <Fragment key={q.id}>
                <ChatQuestion variant={avatar} question={q} />
                {answers[q.id] ? (
                  <li className="kpi-rise flex flex-col items-end gap-1">
                    <p className="max-w-[80%] border-2 border-border bg-accent-soft px-4 py-3 text-sm leading-relaxed break-words whitespace-pre-wrap">
                      {answers[q.id]}
                    </p>
                    <button
                      type="button"
                      onClick={() => goTo(i)}
                      className="cursor-pointer text-xs font-semibold text-muted underline-offset-2 hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:outline-hidden"
                    >
                      Edit
                    </button>
                  </li>
                ) : (
                  <li className="kpi-rise flex items-center justify-end gap-2 text-xs text-muted">
                    <span className="border-2 border-dashed border-muted/60 px-2 py-0.5 font-semibold">Skipped</span>
                    <button
                      type="button"
                      onClick={() => goTo(i)}
                      className="cursor-pointer font-semibold underline decoration-accent decoration-2 underline-offset-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent-strong focus-visible:outline-hidden"
                    >
                      Answer now
                    </button>
                  </li>
                )}
              </Fragment>
            ))}
            {thinking ? (
              <li className="kpi-rise flex items-start gap-3">
                <InterviewAvatar variant={avatar} state="thinking" size={32} className="mt-0.5" />
                <div aria-label="AI is thinking" className="flex h-11 items-center gap-1.5 border-2 border-border bg-surface px-4">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="kpi-dot size-2 bg-foreground" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </li>
            ) : current ? (
              <ChatQuestion key={current.id} variant={avatar} question={current} current state={avatarState} pulse={keys} />
            ) : null}
          </ol>
        </div>
        <form
          className="shrink-0 border-t-2 border-border bg-background px-5 py-4 sm:px-7"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="flex items-end gap-3">
            <Textarea
              ref={inputRef}
              id={inputId}
              aria-label="Your answer"
              rows={2}
              autoFocus
              readOnly={thinking}
              value={draft}
              placeholder="Type your answer…"
              onChange={(e) => {
                setDraft(e.target.value);
                setKeys((k) => k + 1);
              }}
              onKeyDown={onDraftKeyDown}
              className="min-h-0 flex-1 resize-none text-base"
            />
            <Button type="submit" size="lg" disabled={!draft.trim() || thinking || !current}>
              Send
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <SendHint />
            <div className="ml-auto flex items-center gap-2">
              {voice ? (
                <Button type="button" variant="secondary" size="sm" onClick={() => setMode('interview')}>
                  <Mic aria-hidden="true" />
                  Back to voice
                </Button>
              ) : null}
              <Button type="button" variant="ghost" size="sm" onClick={skip} disabled={thinking || !current}>
                Skip question
              </Button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div
      role="presentation"
      className="kpi-m kpi-fade fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 sm:items-center sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <InterviewStyles />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={trapFocus}
        className="kpi-in flex h-dvh w-full flex-col overflow-hidden border-t-2 border-border bg-surface outline-none sm:h-[min(800px,calc(100dvh-3rem))] sm:max-w-2xl sm:border-2 sm:shadow-[8px_8px_0_var(--accent)]"
      >
        <header className="shrink-0 border-b-2 border-border">
          <div aria-hidden="true" className="h-1.5 border-b-2 border-border bg-accent" />
          <div className="flex items-center gap-3 px-5 pt-3 sm:px-7">
            <span aria-hidden="true" className="led" />
            <h2 id={titleId} className="text-lg font-extrabold tracking-tight">
              AI interview
            </h2>
            <span className="flex-1" />
            <div className="hidden sm:block">{tabs(false)}</div>
            <IconButton label="Close interview" onClick={onClose} className="-mr-2">
              <X aria-hidden="true" />
            </IconButton>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 pt-1 pb-3 sm:px-7">
            <p className="text-xs font-extrabold tracking-[0.12em] text-muted uppercase tabular-nums">{progressLabel}</p>
            {total > 0 ? <ProgressSquares items={squares} current={finished ? -1 : index} disabled={thinking} onJump={goTo} /> : null}
            {total > 0 ? (
              <p className="ml-auto hidden text-xs text-muted sm:block">
                {base !== undefined && potential !== undefined ? (
                  <>
                    Rating{' '}
                    <span className="font-bold text-foreground tabular-nums">
                      {base}
                      <To />
                      {potential}
                    </span>{' '}
                    if you answer all
                  </>
                ) : (
                  <>
                    <span className="font-bold text-foreground tabular-nums">+{totalGain} pts</span> available
                  </>
                )}
              </p>
            ) : null}
          </div>
          <div className="px-4 pb-2 sm:hidden">{tabs(true)}</div>
        </header>

        <div className="relative flex min-h-0 flex-1 flex-col">{body}</div>

        <footer className="shrink-0 border-t-2 border-border bg-surface px-5 py-4 sm:px-7">
          {total > 0 ? (
            <ScoreStrip
              base={base}
              gained={gained}
              totalGain={totalGain}
              flash={flash}
              onFinishEarly={!finished && answeredCount > 0 && answeredCount < total ? finishEarly : undefined}
            />
          ) : null}
          <AiNoticeBanner className={total > 0 ? 'mt-3' : undefined} />
        </footer>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </p>
      </div>
    </div>
  );
}

function ChatQuestion({
  variant,
  question,
  current = false,
  state = 'idle',
  pulse = 0,
}: {
  variant: InterviewAvatarVariant;
  question: InterviewQuestion<string>;
  current?: boolean;
  state?: InterviewAvatarState;
  pulse?: number;
}) {
  return (
    <li className="kpi-rise flex items-start gap-3">
      <InterviewAvatar variant={variant} state={state} size={32} pulse={pulse} className="mt-0.5" />
      <div className={clsx('max-w-[85%] border-2 border-border bg-surface px-4 py-3', current && 'shadow-[4px_4px_0_var(--accent)]')}>
        <p className="text-[11px] font-extrabold tracking-[0.12em] text-muted uppercase">{fieldLabel(question.field)}</p>
        <p className="mt-1 leading-snug font-semibold text-pretty">{question.question}</p>
        {current ? <GainChip gain={question.gain} why={question.why} compact /> : null}
      </div>
    </li>
  );
}
