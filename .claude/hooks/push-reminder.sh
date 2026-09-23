#!/usr/bin/env bash
# UserPromptSubmit hook: during the competition window (13:00-18:00 Astana, UTC+5),
# warn Claude when the newest commit on the upstream branch is 30+ minutes old.
# Stdout is added to Claude's context. Fails silently on any error.

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

utc_hour=$(date -u +%H) || exit 0
astana_hour=$(( (10#$utc_hour + 5) % 24 ))
(( astana_hour >= 13 && astana_hour < 18 )) || exit 0

git rev-parse --abbrev-ref '@{u}' >/dev/null 2>&1 || exit 0
last=$(git log -1 --format=%ct '@{u}' 2>/dev/null) || exit 0
[ -n "$last" ] || exit 0

mins=$(( ($(date +%s) - last) / 60 ))
unpushed=$(git rev-list --count '@{u}..HEAD' 2>/dev/null || echo 0)

if (( mins >= 30 )); then
  echo "HACKATHON REMINDER: the newest commit on the upstream branch is ${mins} min old (${unpushed} local commit(s) not pushed). Hourly pushed progress is mandatory — tell the user and commit + push a working increment soon."
fi
exit 0
