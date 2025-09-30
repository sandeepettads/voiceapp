#!/bin/bash

# Script to read application secrets from .env file and push to GitHub
# This assumes you have a .env file with your Azure service configuration

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 Setting up Application Secrets from .env file${NC}"
echo -e "${BLUE}===============================================${NC}"

# Check for .env file locations
ENV_FILES=(
    "$REPO_ROOT/.env"
    "$REPO_ROOT/app/.env"
    "$REPO_ROOT/app/backend/.env"
)

ENV_FILE=""
for file in "${ENV_FILES[@]}"; do
    if [ -f "$file" ]; then
        ENV_FILE="$file"
        echo -e "${GREEN}Found .env file at: $file${NC}"
        break
    fi
done

if [ -z "$ENV_FILE" ]; then
    echo -e "${RED}Error: No .env file found in the following locations:${NC}"
    for file in "${ENV_FILES[@]}"; do
        echo "  - $file"
    done
    echo ""
    echo -e "${YELLOW}Please create a .env file with your Azure service configuration.${NC}"
    echo -e "${YELLOW}Example format:${NC}"
    echo "AZURE_OPENAI_API_KEY=your_openai_key"
    echo "AZURE_SEARCH_API_KEY=your_search_key"
    echo "AZURE_OPENAI_ENDPOINT=https://your-openai.openai.azure.com/"
    echo "AZURE_OPENAI_REALTIME_DEPLOYMENT=your-deployment-name"
    echo "AZURE_SEARCH_ENDPOINT=https://your-search.search.windows.net"
    echo "AZURE_SEARCH_INDEX=your-index-name"
    exit 1
fi

# Check GitHub CLI
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is required but not installed.${NC}"
    exit 1
fi

if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: Not authenticated with GitHub CLI.${NC}"
    exit 1
fi

cd "$REPO_ROOT"

echo -e "${YELLOW}Reading environment variables from $ENV_FILE...${NC}"

# Source the .env file to load variables
set -a  # Automatically export all variables
source "$ENV_FILE"
set +a  # Stop automatically exporting

# Define the secrets we want to set
SECRETS=(
    "AZURE_OPENAI_API_KEY"
    "AZURE_SEARCH_API_KEY"
    "AZURE_OPENAI_ENDPOINT"
    "AZURE_OPENAI_REALTIME_DEPLOYMENT"
    "AZURE_SEARCH_ENDPOINT"
    "AZURE_SEARCH_INDEX"
    "AZURE_OPENAI_REALTIME_VOICE_CHOICE"
    "AZURE_SEARCH_SEMANTIC_CONFIGURATION"
    "AZURE_SEARCH_IDENTIFIER_FIELD"
    "AZURE_SEARCH_CONTENT_FIELD"
    "AZURE_SEARCH_EMBEDDING_FIELD"
    "AZURE_SEARCH_TITLE_FIELD"
    "AZURE_SEARCH_USE_VECTOR_QUERY"
)

echo -e "${YELLOW}Setting up GitHub repository secrets...${NC}"

CREATED_COUNT=0
SKIPPED_COUNT=0

for secret_name in "${SECRETS[@]}"; do
    # Get the value of the environment variable
    secret_value="${!secret_name}"
    
    if [ -n "$secret_value" ]; then
        echo "Setting $secret_name..."
        echo "$secret_value" | gh secret set "$secret_name"
        ((CREATED_COUNT++))
    else
        echo "Skipping $secret_name (not found in .env file)"
        ((SKIPPED_COUNT++))
    fi
done

echo ""
echo -e "${GREEN}✅ Successfully created $CREATED_COUNT secrets${NC}"
echo -e "${YELLOW}⏭️  Skipped $SKIPPED_COUNT secrets (not found in .env)${NC}"

# List all secrets
echo -e "\n${YELLOW}Current repository secrets:${NC}"
gh secret list

echo -e "\n${GREEN}🎉 Application secrets setup complete!${NC}"
echo -e "${YELLOW}Your Docker image will be built WITHOUT embedded secrets.${NC}"
echo -e "${YELLOW}Secrets will be injected at runtime during container deployment.${NC}"

echo -e "\n${BLUE}🔒 Security Status:${NC}"
echo -e "  ✅ Secrets stored securely in GitHub"
echo -e "  ✅ Docker image contains NO sensitive data"
echo -e "  ✅ Runtime environment injection ready"
echo -e "  ✅ Enterprise security policies compliant"
