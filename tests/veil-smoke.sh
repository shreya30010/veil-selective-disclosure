#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:80/api}"
DEMO_TEXT='Journalist Ananya Rao met confidential source Ravi Kumar at 14 MG Road, Bengaluru. Ravi provided financial documents concerning fictional company Novacore Systems. Ravi can be contacted at ravi.kumar@example.com or +91 98765 43210.'

health="$(curl -fsS "$BASE_URL/healthz")"
[[ "$health" == *'"status":"ok"'* ]]

demo="$(curl -fsS "$BASE_URL/veil/demo")"
[[ "$demo" == *'"fictional":true'* ]]

empty="$(curl -fsS -X POST "$BASE_URL/veil/scan" -H 'content-type: application/json' --data '{"text":""}')"
[[ "$empty" == *'"entities":[]'* ]]

scan="$(curl -fsS -X POST "$BASE_URL/veil/scan" -H 'content-type: application/json' --data "{\"text\":\"$DEMO_TEXT\"}")"
[[ "$scan" == *'"type":"CONFIDENTIAL_SOURCE"'* ]]
[[ "$scan" == *'"exposureScore":'* ]]

public_view="$(curl -fsS -X POST "$BASE_URL/veil/transform" -H 'content-type: application/json' --data "{\"role\":\"PUBLIC\",\"text\":\"$DEMO_TEXT\"}")"
[[ "$public_view" == *'[SOURCE PROTECTED]'* ]]

investigator_view="$(curl -fsS -X POST "$BASE_URL/veil/transform" -H 'content-type: application/json' --data "{\"role\":\"AUTHORIZED_INVESTIGATOR\",\"text\":\"$DEMO_TEXT\"}")"
[[ "$investigator_view" == *'ravi.kumar@example.com'* ]]

blocked="$(curl -fsS -X POST "$BASE_URL/veil/disclose" -H 'content-type: application/json' --data '{"role":"PUBLIC","resource":"CONFIDENTIAL_SOURCE"}')"
[[ "$blocked" == *'"allowed":false'* && "$blocked" == *'"result":"BLOCKED"'* ]]

allowed="$(curl -fsS -X POST "$BASE_URL/veil/disclose" -H 'content-type: application/json' --data '{"role":"AUTHORIZED_INVESTIGATOR","resource":"CONFIDENTIAL_SOURCE"}')"
[[ "$allowed" == *'"allowed":true'* && "$allowed" == *'"result":"ALLOWED"'* ]]

audit="$(curl -fsS "$BASE_URL/veil/audit-log")"
[[ "$audit" == *'"result":"BLOCKED"'* && "$audit" == *'"result":"ALLOWED"'* ]]

echo "VEIL smoke checks passed."