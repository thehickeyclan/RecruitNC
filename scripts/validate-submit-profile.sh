#!/bin/sh
# Validate that user-submitted profiles POST works and returns 201.
# Run with dev server up: npm run dev (or npx next dev), then:
#   ./scripts/validate-submit-profile.sh
# Or: sh scripts/validate-submit-profile.sh

set -e
BASE="${1:-http://localhost:3000}"
echo "Testing POST $BASE/api/athlete-profile-submissions ..."

RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE/api/athlete-profile-submissions" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Validate",
    "lastName": "Test",
    "gender": "Male",
    "graduationYear": "2028",
    "email": "validate-test@example.com",
    "highSchool": "Test High"
  }')

BODY=$(echo "$RES" | head -n -1)
CODE=$(echo "$RES" | tail -n 1)

if [ "$CODE" = "201" ]; then
  echo "OK — API returned 201, submission saved."
  echo "$BODY" | head -c 500
  echo ""
  exit 0
else
  echo "FAIL — API returned $CODE (expected 201)."
  echo "$BODY"
  exit 1
fi
