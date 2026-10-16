#!/usr/bin/env bash
# Build with Cloud Build and deploy to Cloud Run, passing the .env settings through.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] && set -a && . ./.env && set +a

PROJECT="${GOOGLE_CLOUD_PROJECT:?set GOOGLE_CLOUD_PROJECT}"
REGION="${GOOGLE_CLOUD_LOCATION:-us-central1}"
SERVICE="${SERVICE:-claimshield-ai}"
SA="claimshield-run@${PROJECT}.iam.gserviceaccount.com"
PYTHON="${PYTHON:-python3}"

# Validate locally before any deployment command. Demo mode must never be deployed.
export CLAIMSHIELD_AUTH_MODE="${CLAIMSHIELD_AUTH_MODE:?set CLAIMSHIELD_AUTH_MODE=iap}"
[ "$CLAIMSHIELD_AUTH_MODE" = iap ] || { echo "Deployment requires IAP authentication" >&2; exit 1; }
"$PYTHON" -c 'from claimshield.api.auth import configure_auth; from claimshield.config import load_settings; configure_auth(load_settings())'

# JSON is accepted as YAML by --env-vars-file and preserves commas in membership maps.
ENV_FILE="$(mktemp)"
trap 'rm -f "$ENV_FILE"' EXIT
"$PYTHON" - "$ENV_FILE" <<'PY'
import json, os, sys
names = """GOOGLE_CLOUD_PROJECT GOOGLE_CLOUD_LOCATION CLAIMSHIELD_USE_DOCAI DOCAI_LOCATION DOCAI_PROCESSOR_ID
CLAIMSHIELD_USE_BIGQUERY BQ_DATASET CLAIMSHIELD_USE_VERTEX_SEARCH VERTEX_SEARCH_LOCATION
VERTEX_SEARCH_DATASTORE_ID CLAIMSHIELD_USE_GEMINI GEMINI_MODEL CLAIMSHIELD_USE_GCS GCS_BUCKET
CLAIMSHIELD_USE_ADK CLAIMSHIELD_OUTLIER_RATIO CLAIMSHIELD_DEMO_PACE CLAIMSHIELD_AUTH_MODE
CLAIMSHIELD_IAP_AUDIENCE CLAIMSHIELD_PUBLIC_ORIGIN CLAIMSHIELD_AUTH_MEMBERSHIPS
CLAIMSHIELD_REGULATORY_ADMIN_SUBJECTS""".split()
with open(sys.argv[1], "w", encoding="utf-8") as stream:
    json.dump({k: os.environ[k] for k in names if os.environ.get(k)}, stream)
PY

# The live trace streams from the instance running the audit, so keep to one instance and
# turn on session affinity. Plenty for a demo; see README "Scaling beyond the demo".
gcloud run deploy "$SERVICE" \
  --project "$PROJECT" --region "$REGION" --source . \
  --service-account "$SA" \
  --no-allow-unauthenticated --iap \
  --memory 1Gi --cpu 1 --timeout 300 \
  --min-instances 1 --max-instances 1 --session-affinity \
  --env-vars-file "$ENV_FILE"

gcloud run services describe "$SERVICE" --project "$PROJECT" --region "$REGION" --format='value(status.url)'
