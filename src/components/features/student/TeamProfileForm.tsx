'use client';

import { useState } from 'react';
import type { TeamProfile } from '@/lib/types';
import { useStore } from '@/lib/store';
import { useHydrated } from '../useHydrated';

export function TeamProfileForm() {
  const hydrated = useHydrated();
  const team = useStore((s) => s.teams.find((t) => t.id === s.currentTeamId));
  if (!hydrated) return null;
  if (!team) return <p>No team selected.</p>;
  return <Form key={team.id} team={team} />;
}

const toList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

function Form({ team }: { team: TeamProfile }) {
  const updateTeam = useStore((s) => s.updateTeam);
  const [form, setForm] = useState({
    name: team.name, about: team.about,
    interests: team.interests.join(', '), skills: team.skills.join(', '), tech: team.tech.join(', '),
  });
  const [saved, setSaved] = useState(false);

  const save = () => {
    updateTeam(team.id, {
      name: form.name, about: form.about,
      interests: toList(form.interests), skills: toList(form.skills), tech: toList(form.tech),
    });
    setSaved(true);
  };

  const field = (key: keyof typeof form, label: string, hint?: string) => (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>{hint && <span className="text-xs text-muted"> {hint}</span>}
      <input className="w-full rounded-control border-2 border-border bg-surface px-2 py-1" value={form[key]}
        onChange={(e) => { setForm({ ...form, [key]: e.target.value }); setSaved(false); }} />
    </label>
  );

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-extrabold">Team profile</h1>
      <p className="text-xs text-muted">Team-level info only — no personal or sensitive attributes.</p>
      {field('name', 'Team name')}
      <label className="block space-y-1 text-sm">
        <span className="font-medium">About</span>
        <textarea className="h-20 w-full rounded-control border-2 border-border bg-surface p-2" value={form.about}
          onChange={(e) => { setForm({ ...form, about: e.target.value }); setSaved(false); }} />
      </label>
      {field('interests', 'Interests', '(comma-separated)')}
      {field('skills', 'Skills', '(comma-separated)')}
      {field('tech', 'Tech', '(comma-separated)')}
      <button onClick={save} className="inline-flex items-center gap-2 rounded-control bg-primary px-4 py-2 font-semibold text-primary-foreground"><span className="led" />Save</button>
      {saved && <span className="ml-3 text-sm text-[#365314]">Saved</span>}
    </div>
  );
}
