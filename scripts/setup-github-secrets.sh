#!/bin/bash

# Script to push Azure credentials to GitHub repository secrets
# Requires: jq, gh (GitHub CLI)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CREDENTIALS_FILE="$REPO_ROOT/Enterprisestandard/azurecredentials.json"
ENV_FILE="$REPO_ROOT/.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Setting up GitHub repository secrets for Azure credentials...${NC}"

# Check if credentials file exists
if [ ! -f "$CREDENTIALS_FILE" ]; then
    echo -e "${RED}Error: Azure credentials file not found at $CREDENTIALS_FILE${NC}"
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is required but not installed. Please install jq first.${NC}"
    echo "Install with: brew install jq"
    exit 1
fi

# Check if GitHub CLI is installed and authenticated
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is required but not installed.${NC}"
    echo "Install with: brew install gh"
    echo "Then authenticate with: gh auth login"
    exit 1
fi

# Check if authenticated with GitHub
if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: Not authenticated with GitHub CLI.${NC}"
    echo "Please run: gh auth login"
    exit 1
fi

# Change to repository directory
cd "$REPO_ROOT"

# Extract credentials from JSON file
echo "Reading credentials from $CREDENTIALS_FILE..."

# Handle nested structure in your credentials file
CLIENT_ID=$(jq -r '.servicePrincipal.clientId // .clientId // .client_id // .appId' "$CREDENTIALS_FILE")
CLIENT_SECRET=$(jq -r '.servicePrincipal.clientSecret // .clientSecret // .client_secret // .password' "$CREDENTIALS_FILE")
TENANT_ID=$(jq -r '.subscription.tenantId // .tenantId // .tenant_id // .tenant' "$CREDENTIALS_FILE")
SUBSCRIPTION_ID=$(jq -r '.subscription.subscriptionId // .subscriptionId // .subscription_id // .subscription' "$CREDENTIALS_FILE")

# Validate that all required fields are present
if [ "$CLIENT_ID" = "null" ] || [ -z "$CLIENT_ID" ]; then
    echo -e "${RED}Error: clientId not found in credentials file${NC}"
    exit 1
fi

if [ "$CLIENT_SECRET" = "null" ] || [ -z "$CLIENT_SECRET" ]; then
    echo -e "${RED}Error: clientSecret not found in credentials file${NC}"
    exit 1
fi

if [ "$TENANT_ID" = "null" ] || [ -z "$TENANT_ID" ]; then
    echo -e "${RED}Error: tenantId not found in credentials file${NC}"
    exit 1
fi

if [ "$SUBSCRIPTION_ID" = "null" ] || [ -z "$SUBSCRIPTION_ID" ]; then
    echo -e "${RED}Error: subscriptionId not found in credentials file${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Successfully read all Azure infrastructure credentials${NC}"

# Extract application secrets from .env file
echo "Reading application secrets from $ENV_FILE..."

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: .env file not found at $ENV_FILE${NC}"
    echo -e "${YELLOW}This file contains critical application secrets (AZURE_OPENAI_API_KEY, AZURE_SEARCH_KEY)${NC}"
    exit 1
fi

# Extract application secrets from .env file
AZURE_OPENAI_API_KEY=$(grep '^AZURE_OPENAI_API_KEY=' "$ENV_FILE" | cut -d'=' -f2-)
AZURE_SEARCH_KEY=$(grep '^AZURE_SEARCH_KEY=' "$ENV_FILE" | cut -d'=' -f2-)

# Validate application secrets
if [ -z "$AZURE_OPENAI_API_KEY" ]; then
    echo -e "${RED}Error: AZURE_OPENAI_API_KEY not found in .env file${NC}"
    echo -e "${YELLOW}This secret is required for OpenAI service authentication${NC}"
    exit 1
fi

if [ -z "$AZURE_SEARCH_KEY" ]; then
    echo -e "${RED}Error: AZURE_SEARCH_KEY not found in .env file${NC}"
    echo -e "${YELLOW}This secret is required for Azure Search service authentication${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Successfully read all application secrets${NC}"

# Create GitHub repository secrets
echo "Creating GitHub repository secrets..."
echo ""

# Azure Infrastructure Secrets
echo -e "${YELLOW}Setting Azure Infrastructure Secrets:${NC}"
echo "Setting AZURE_CLIENT_ID..."
echo "$CLIENT_ID" | gh secret set AZURE_CLIENT_ID

echo "Setting AZURE_CLIENT_SECRET..."
echo "$CLIENT_SECRET" | gh secret set AZURE_CLIENT_SECRET

echo "Setting AZURE_TENANT_ID..."
echo "$TENANT_ID" | gh secret set AZURE_TENANT_ID

echo "Setting AZURE_SUBSCRIPTION_ID..."
echo "$SUBSCRIPTION_ID" | gh secret set AZURE_SUBSCRIPTION_ID

echo ""

# Application-Specific Secrets
echo -e "${YELLOW}Setting Application-Specific Secrets:${NC}"
echo "Setting AZURE_OPENAI_API_KEY..."
echo "$AZURE_OPENAI_API_KEY" | gh secret set AZURE_OPENAI_API_KEY

echo "Setting AZURE_SEARCH_KEY..."
echo "$AZURE_SEARCH_KEY" | gh secret set AZURE_SEARCH_KEY

echo ""
echo -e "${GREEN}✅ All secrets have been successfully created in the GitHub repository!${NC}"

# List the secrets to confirm
echo -e "\n${YELLOW}Current repository secrets:${NC}"
gh secret list

echo -e "\n${GREEN}🎉 Setup complete! Your GitHub Actions workflow can now use these secrets.${NC}"
echo -e "${YELLOW}Secrets created:${NC}"
echo -e "  ✅ Azure Infrastructure: AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID, AZURE_SUBSCRIPTION_ID"
echo -e "  ✅ Application Services: AZURE_OPENAI_API_KEY, AZURE_SEARCH_KEY"
echo ""
echo -e "${GREEN}Your workflow will now be able to:${NC}"
echo -e "  • Authenticate with Azure services"
echo -e "  • Access OpenAI GPT models"
echo -e "  • Connect to Azure Search for RAG functionality"
echo -e "  • Deploy containers with all required environment variables"
echo ""
echo -e "${YELLOW}🚀 Ready to run your GitHub Actions workflow!${NC}"
