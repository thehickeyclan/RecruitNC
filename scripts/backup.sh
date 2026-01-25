#!/bin/bash

# RecruitNC Backup Script
# Creates a timestamped zip backup of the codebase, excluding build artifacts and dependencies

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PARENT_DIR="$(dirname "$PROJECT_DIR")"
PROJECT_NAME="Recruit-NC-main"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="Recruit-NC-backup-${TIMESTAMP}.zip"
BACKUP_PATH="${PARENT_DIR}/${BACKUP_NAME}"

echo "📦 Creating backup: ${BACKUP_NAME}"
echo "📁 Project directory: ${PROJECT_DIR}"
echo "💾 Backup location: ${BACKUP_PATH}"
echo ""

cd "$PARENT_DIR"

zip -r "$BACKUP_NAME" "$PROJECT_NAME" \
  -x "${PROJECT_NAME}/node_modules/*" \
  -x "${PROJECT_NAME}/.next/*" \
  -x "${PROJECT_NAME}/.vercel/*" \
  -x "${PROJECT_NAME}/.git/*" \
  -x "${PROJECT_NAME}/.DS_Store" \
  -x "${PROJECT_NAME}/*.log" \
  -x "${PROJECT_NAME}/.turbo/*" \
  -x "${PROJECT_NAME}/dist/*" \
  -x "${PROJECT_NAME}/build/*" \
  -x "${PROJECT_NAME}/coverage/*" \
  -x "${PROJECT_NAME}/.cache/*" \
  -x "${PROJECT_NAME}/.vscode/*" \
  -x "${PROJECT_NAME}/.idea/*" \
  > /dev/null 2>&1

if [ $? -eq 0 ]; then
  SIZE=$(ls -lh "$BACKUP_PATH" | awk '{print $5}')
  echo "✅ Backup created successfully!"
  echo "📊 File size: ${SIZE}"
  echo "📍 Location: ${BACKUP_PATH}"
else
  echo "❌ Backup failed!"
  exit 1
fi
