#!/bin/bash

# Migration Helper Script
# Helps migrate specific features from RecruitNC to LegacyNC
# Usage: ./scripts/migrate-to-legacync.sh <feature-name>

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RECRUITNC_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${RECRUITNC_DIR}/../recruitnc-reference"
LEGACYNC_DIR="/Users/matthickey/Downloads/legacy-nc"  # LegacyNC project directory

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🔄 RecruitNC → LegacyNC Migration Helper"
echo ""

# Check if LegacyNC directory exists
if [ ! -d "$LEGACYNC_DIR" ]; then
    echo -e "${RED}❌ LegacyNC directory not found at: $LEGACYNC_DIR${NC}"
    echo "Please update LEGACYNC_DIR in this script to point to your LegacyNC directory"
    exit 1
fi

# Extract backup if reference doesn't exist
if [ ! -d "$BACKUP_DIR" ]; then
    echo -e "${YELLOW}📦 Reference directory not found. Looking for backup zip...${NC}"
    
    LATEST_BACKUP=$(ls -t "${RECRUITNC_DIR}/../Recruit-NC-backup-"*.zip 2>/dev/null | head -1)
    
    if [ -z "$LATEST_BACKUP" ]; then
        echo -e "${RED}❌ No backup zip found. Please create a backup first with: ./scripts/backup.sh${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Found backup: $(basename "$LATEST_BACKUP")${NC}"
    echo "Extracting to reference directory..."
    unzip -q -o "$LATEST_BACKUP" -d "$(dirname "$BACKUP_DIR")" 2>/dev/null || unzip -o "$LATEST_BACKUP" -d "$(dirname "$BACKUP_DIR")"
    mv "$(dirname "$BACKUP_DIR")/Recruit-NC-main" "$BACKUP_DIR" 2>/dev/null || true
    echo -e "${GREEN}✅ Reference extracted to: $BACKUP_DIR${NC}"
fi

# Function to copy a feature
copy_feature() {
    local SOURCE_PATH="$1"
    local DEST_PATH="$2"
    local FEATURE_NAME="$3"
    
    local FULL_SOURCE="${BACKUP_DIR}/${SOURCE_PATH}"
    local FULL_DEST="${LEGACYNC_DIR}/${DEST_PATH}"
    
    echo ""
    echo -e "${YELLOW}📋 Migrating: $FEATURE_NAME${NC}"
    echo "   Source: $SOURCE_PATH"
    echo "   Dest:   $DEST_PATH"
    
    # Check if source exists
    if [ ! -e "$FULL_SOURCE" ]; then
        echo -e "${RED}❌ Source not found: $FULL_SOURCE${NC}"
        return 1
    fi
    
    # Check if destination exists
    if [ -e "$FULL_DEST" ]; then
        echo -e "${YELLOW}⚠️  Destination already exists: $FULL_DEST${NC}"
        read -p "   Overwrite? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}⏭️  Skipped${NC}"
            return 0
        fi
    fi
    
    # Create destination directory if needed
    mkdir -p "$(dirname "$FULL_DEST")"
    
    # Copy the file/directory
    cp -r "$FULL_SOURCE" "$FULL_DEST"
    echo -e "${GREEN}✅ Copied successfully${NC}"
    
    return 0
}

# Feature definitions
case "$1" in
    "recruiting-pages")
        copy_feature "app/recruiting" "app/recruiting" "Recruiting Pages"
        ;;
    "prospects")
        copy_feature "app/prospects" "app/prospects" "Prospects Pages"
        ;;
    "coach-portal")
        copy_feature "app/coaches" "app/coaches" "Coach Portal Pages"
        copy_feature "app/coach-portal" "app/coach-portal" "Coach Portal"
        copy_feature "app/schools/[schoolId]/portal" "app/schools/[schoolId]/portal" "School Portal"
        ;;
    "coach-apis")
        copy_feature "app/api/coaches" "app/api/coaches" "Coach APIs"
        copy_feature "app/api/coach-portal" "app/api/coach-portal" "Coach Portal APIs"
        ;;
    "nhsca-import")
        copy_feature "app/api/admin/nhsca-placements" "app/api/admin/nhsca-placements" "NHSCA Import System"
        ;;
    "prospect-apis")
        copy_feature "app/api/prospects" "app/api/prospects" "Prospect APIs"
        copy_feature "app/api/admin/prospects" "app/api/admin/prospects" "Admin Prospect APIs"
        ;;
    "public-rankings")
        copy_feature "app/public-rankings" "app/public-rankings" "Public Rankings Pages"
        copy_feature "app/api/public-rankings" "app/api/public-rankings" "Public Rankings API"
        ;;
    "recruiting-components")
        echo "📋 Copying recruiting components..."
        find "${BACKUP_DIR}/components" -name "recruiting-*" -o -name "*prospect*" -o -name "create-prospect*" | while read file; do
            rel_path=${file#$BACKUP_DIR/}
            copy_feature "$rel_path" "$rel_path" "Component: $(basename "$file")"
        done
        ;;
    "rankings-service")
        copy_feature "services/rankings-service.ts" "services/rankings-service.ts" "Rankings Service"
        ;;
    "all")
        echo -e "${YELLOW}⚠️  Migrating ALL features. This may overwrite existing files.${NC}"
        read -p "Continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 0
        fi
        
        $0 recruiting-pages
        $0 prospects
        $0 coach-portal
        $0 coach-apis
        $0 nhsca-import
        $0 prospect-apis
        $0 public-rankings
        $0 recruiting-components
        $0 rankings-service
        ;;
    "list")
        echo "Available features to migrate:"
        echo "  recruiting-pages      - /recruiting pages"
        echo "  prospects            - /prospects pages"
        echo "  coach-portal         - Coach portal pages"
        echo "  coach-apis           - Coach API routes"
        echo "  nhsca-import         - NHSCA import system"
        echo "  prospect-apis        - Prospect API routes"
        echo "  public-rankings      - Public rankings pages & API"
        echo "  recruiting-components - Recruiting-related components"
        echo "  rankings-service     - Rankings service"
        echo "  all                  - Migrate everything"
        ;;
    *)
        echo -e "${RED}❌ Unknown feature: $1${NC}"
        echo ""
        echo "Usage: $0 <feature-name>"
        echo ""
        $0 list
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}✅ Migration complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Review the migrated files in LegacyNC"
echo "2. Install/update dependencies: cd LegacyNC && npm install"
echo "3. Check for import errors and fix them"
echo "4. Test the migrated features"
echo "5. Update navigation/menus to include new routes"
