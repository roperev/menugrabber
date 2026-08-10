#!/usr/bin/env bash
#
# grab_menu.sh — Scrape the Westfield Elementary (Alpine School District) LUNCH
# menu from LinqConnect's public API and write a clean menu.json for the dashboard.
#
# Runs daily from cron. Fetches a 21-day window (today .. today+21) so that
# "today", "tomorrow" and the next ~3 weeks are always available offline.
#
# Requires: bash, curl, jq, GNU date (all standard on modern Linux).
#
# Config via environment variables (sensible defaults below):
#   BUILDING_ID   LinqConnect building GUID (Westfield Elementary)
#   DISTRICT_ID   LinqConnect district GUID (Alpine School District)
#   SCHOOL_NAME   Display name for the school
#   DISTRICT_NAME Display name for the district
#   OUT_FILE      Where to write the JSON (default: server data path)
#   DAYS_AHEAD    How many days past today to fetch (default: 21)
#   START_DATE    Override start date as M-D-YYYY (mainly for testing off-season)
#
# Example (local dev, seed a known school week):
#   OUT_FILE=web/data/menu.json START_DATE=9-8-2025 ./scraper/grab_menu.sh
#
set -euo pipefail

# ----- configuration -------------------------------------------------------
BUILDING_ID="${BUILDING_ID:-c0e23971-5bad-ed11-8e6a-9bfa3b2b51d1}"
DISTRICT_ID="${DISTRICT_ID:-a83d5cd9-a7a8-ed11-8e69-da0395d724bd}"
SCHOOL_NAME="${SCHOOL_NAME:-Westfield Elementary}"
DISTRICT_NAME="${DISTRICT_NAME:-Alpine School District}"
OUT_FILE="${OUT_FILE:-/var/www/rprnt/menugrabber/data/menu.json}"
DAYS_AHEAD="${DAYS_AHEAD:-21}"

API_BASE="https://api.linqconnect.com/api/FamilyMenu"
# The API's WAF returns 403 without a browser-like User-Agent + Origin + Referer.
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

log() { echo "[grab_menu $(date '+%Y-%m-%d %H:%M:%S')] $*" >&2; }
fail() { log "ERROR: $*"; exit 1; }

# ----- preflight -----------------------------------------------------------
command -v curl >/dev/null 2>&1 || fail "curl not found (install curl)"
command -v jq   >/dev/null 2>&1 || fail "jq not found (install jq: apt install jq)"

# ----- portable date helpers ----------------------------------------------
# Works with GNU date (Linux / production) and BSD date (macOS / dev).
_is_gnu_date=0
date --version >/dev/null 2>&1 && _is_gnu_date=1

# now_iso: current time as ISO-8601 with timezone offset.
now_iso() {
  if [[ $_is_gnu_date -eq 1 ]]; then
    date --iso-8601=seconds
  else
    date '+%Y-%m-%dT%H:%M:%S%z'
  fi
}

# add_days FROM_MDY N -> prints (FROM + N days) as M-D-YYYY.
# FROM_MDY is M-D-YYYY, or "today" to mean the current date.
add_days() {
  local from="$1" n="$2"
  if [[ $_is_gnu_date -eq 1 ]]; then
    if [[ "$from" == "today" ]]; then
      date -d "+${n} days" '+%m-%d-%Y'
    else
      date -d "$(echo "$from" | tr '-' '/') +${n} days" '+%m-%d-%Y'
    fi
  else
    if [[ "$from" == "today" ]]; then
      date -v"+${n}d" '+%m-%d-%Y'
    else
      # BSD: parse an explicit M-D-YYYY input, then add days.
      date -j -v"+${n}d" -f '%m-%d-%Y' "$from" '+%m-%d-%Y'
    fi
  fi
}

# ----- date window ---------------------------------------------------------
# Menu API wants M-D-YYYY (US, no zero padding required).
if [[ -n "${START_DATE:-}" ]]; then
  start_date="$START_DATE"
  end_date="$(add_days "$START_DATE" "$DAYS_AHEAD")"
else
  start_date="$(add_days today 0)"
  end_date="$(add_days today "$DAYS_AHEAD")"
fi

log "Fetching $SCHOOL_NAME lunch: $start_date .. $end_date"

url="${API_BASE}?buildingId=${BUILDING_ID}&districtId=${DISTRICT_ID}&startDate=${start_date}&endDate=${end_date}"

# ----- fetch ---------------------------------------------------------------
raw="$(mktemp)"
trap 'rm -f "$raw"' EXIT

http_code="$(curl -sS -o "$raw" -w '%{http_code}' \
  -A "$UA" \
  -H 'Accept: application/json, text/plain, */*' \
  -H 'Origin: https://linqconnect.com' \
  -H 'Referer: https://linqconnect.com/' \
  "$url" || echo "000")"

[[ "$http_code" == "200" ]] || fail "API returned HTTP $http_code (expected 200)"
jq empty "$raw" 2>/dev/null || fail "API response was not valid JSON"

# Sanity: the response must contain the expected top-level structure.
jq -e 'has("FamilyMenuSessions")' "$raw" >/dev/null 2>&1 \
  || fail "API response missing FamilyMenuSessions"

# ----- transform -----------------------------------------------------------
# Keep LUNCH only, drop Condiments, key each day by ISO date (YYYY-MM-DD),
# and preserve category order as returned.
updated_iso="$(now_iso)"

out="$(mktemp)"
trap 'rm -f "$raw" "$out"' EXIT

jq \
  --arg school "$SCHOOL_NAME" \
  --arg district "$DISTRICT_NAME" \
  --arg updated "$updated_iso" '
  # "M/D/YYYY" -> "YYYY-MM-DD"
  def iso_date($d):
    ($d | split("/")) as $p
    | ($p[2]) + "-"
      + (($p[0] | tonumber | if . < 10 then "0" + tostring else tostring end))
      + "-"
      + (($p[1] | tonumber | if . < 10 then "0" + tostring else tostring end));

  {
    school:   $school,
    district: $district,
    last_updated: $updated,
    days: (
      [ .FamilyMenuSessions[]?
        | select(.ServingSession == "Lunch")
        | .MenuPlans[]?.Days[]?
        | { date: iso_date(.Date),
            categories: [
              .MenuMeals[]?.RecipeCategories[]?
              | select((.CategoryName // "") | ascii_downcase | contains("condiment") | not)
              | { name: .CategoryName,
                  items: [ .Recipes[]?.RecipeName
                           | select(. != null and . != "") ] }
              | select((.items | length) > 0)
            ]
          }
        | select((.categories | length) > 0)
      ]
      # Merge any duplicate day entries and index by ISO date.
      | reduce .[] as $day ({};
          .[$day.date] = { categories: ((.[$day.date].categories // []) + $day.categories) })
      )
  }
' "$raw" > "$out" || fail "jq transform failed"

# Must be valid JSON with at least the wrapper keys before we publish.
jq -e 'has("days")' "$out" >/dev/null 2>&1 || fail "transformed output invalid"

day_count="$(jq '.days | length' "$out")"
log "Parsed $day_count day(s) of lunch data"

# ----- publish atomically --------------------------------------------------
# NOTE: mktemp files are mode 0600. Make the published file world-readable
# (0644) so the web server user (e.g. www-data) can serve it — otherwise
# Apache returns 403 Forbidden for data/menu.json.
mkdir -p "$(dirname "$OUT_FILE")"
tmp_final="${OUT_FILE}.tmp.$$"
cp "$out" "$tmp_final"
chmod 644 "$tmp_final"
mv -f "$tmp_final" "$OUT_FILE"
log "Wrote $OUT_FILE"
