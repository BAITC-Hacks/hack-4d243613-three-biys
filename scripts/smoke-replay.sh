#!/usr/bin/env bash
# Golden-path smoke test against a running server (default http://localhost:3000): health, clarify, card, techspec,
# discover, recommend, sources, ingest. Works in replay mode with no key. Usage: scripts/smoke-replay.sh [baseUrl]
set -u
BASE=${1:-http://localhost:3000}; fail=0
check() { # name, method, path, body   (name ending in "?" = optional, warns only)
  local out; if [ "$2" = GET ]; then out=$(curl -s -m 60 "$BASE$3"); else out=$(curl -s -m 90 -X POST "$BASE$3" -H 'content-type: application/json' ${TOKEN:+-H "authorization: Bearer $TOKEN"} -d "$4"); fi
  if echo "$out" | grep -q '"ok":true'; then echo "PASS $1"; elif [[ "$1" == *\? ]]; then echo "WARN $1 (optional): $(echo "$out" | head -c 120)"; else echo "FAIL $1: $(echo "$out" | head -c 200)"; fail=1; fi
}
DRAFT='Our sales team wastes time moving orders from Excel to the CRM. We want to automate it.'
check health GET /api/health
check clarify POST /api/ai/clarify "{\"draftText\":\"$DRAFT\",\"industry\":\"Logistics\"}"
check card POST /api/ai/card "{\"draftText\":\"$DRAFT\",\"answers\":[{\"questionId\":\"q1\",\"field\":\"data\",\"question\":\"Data?\",\"answer\":\"Dealers send orders as Excel files; we can share anonymized files and the CRM REST API docs.\"}]}"
check techspec POST /api/ai/techspec '{"fields":{"title":"Automate order import","context":"Sales retypes dealer Excel orders into the CRM.","need":"Automate the transfer.","users":"6 sales managers","data":"Excel samples, CRM API docs","constraints":"6 weeks, REST API","expectedResult":"Import script","successCriteria":"Entry time -80%, zero duplicates","contact":"Head of sales, weekly call"}}'
check discover POST /api/ai/discover '{"period":{"from":"2026-08-24","to":"2026-09-23"}}'
check 'recommend?' POST /api/ai/recommend '{"team":{"id":"t","name":"DataCraft","about":"","interests":["Automation"],"skills":["Python"],"tech":["pandas"]},"tasks":[{"id":"card-qazcargo-seed","title":"Morning route sheet for drivers","topic":"Automation","summary":"Send routes from Excel to drivers","level":"working"}]}'
check sources GET /api/sources
TOKEN=${INGEST_TOKEN:-} check ingest POST /api/ingest/events '{"deviceId":"smoke","team":"Sales","events":[{"ts":"2026-09-23T09:00:00Z","event":"focus","app":"CRM","durationSec":60}]}'
exit $fail
