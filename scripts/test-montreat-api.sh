#!/bin/bash
# Test the Montreat logo API endpoint

echo "Testing Montreat logo API..."
curl -H "Cache-Control: no-cache" -H "Pragma: no-cache" "https://app.ncwrestlingunited.com/api/logo-mappings/by-entity/college/Montreat"

