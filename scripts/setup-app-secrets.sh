#!/bin/bash

# Script to set up application secrets for the Azure services
# This script will help you add all the required application secrets to GitHub

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 Application Secrets Setup for Azure Services${NC}"
echo -e "${BLUE}================================================${NC}"

# Check if GitHub CLI is installed and authenticated
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is required but not installed.${NC}"
    echo "Install with: brew install gh"
    exit 1
fi

if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: Not authenticated with GitHub CLI.${NC}"
    echo "Please run: gh auth login"
    exit 1
fi

cd "$REPO_ROOT"

echo -e "${YELLOW}This script will help you set up the following application secrets:${NC}"
echo -e "${BLUE}Required secrets:${NC}"
echo "  - AZURE_OPENAI_API_KEY"
echo "  - AZURE_SEARCH_API_KEY"
echo "  - AZURE_OPENAI_ENDPOINT"
echo "  - AZURE_OPENAI_REALTIME_DEPLOYMENT"
echo "  - AZURE_SEARCH_ENDPOINT"
echo "  - AZURE_SEARCH_INDEX"
echo ""
echo -e "${BLUE}Optional secrets:${NC}"
echo "  - AZURE_OPENAI_REALTIME_VOICE_CHOICE (default: alloy)"
echo "  - AZURE_SEARCH_SEMANTIC_CONFIGURATION"
echo "  - AZURE_SEARCH_IDENTIFIER_FIELD (default: chunk_id)"
echo "  - AZURE_SEARCH_CONTENT_FIELD (default: chunk)"
echo "  - AZURE_SEARCH_EMBEDDING_FIELD (default: text_vector)"
echo "  - AZURE_SEARCH_TITLE_FIELD (default: title)"
echo "  - AZURE_SEARCH_USE_VECTOR_QUERY (default: true)"
echo ""

read -p "Do you want to proceed with setting up these secrets? (y/N): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 0
fi

echo ""
echo -e "${YELLOW}Please provide the following values (press Enter to skip optional ones):${NC}"

# Required secrets
echo -e "${BLUE}Required Secrets:${NC}"
read -p "AZURE_OPENAI_API_KEY: " -s AZURE_OPENAI_API_KEY
echo ""
read -p "AZURE_SEARCH_API_KEY: " -s AZURE_SEARCH_API_KEY
echo ""
read -p "AZURE_OPENAI_ENDPOINT: " AZURE_OPENAI_ENDPOINT
read -p "AZURE_OPENAI_REALTIME_DEPLOYMENT: " AZURE_OPENAI_REALTIME_DEPLOYMENT
read -p "AZURE_SEARCH_ENDPOINT: " AZURE_SEARCH_ENDPOINT
read -p "AZURE_SEARCH_INDEX: " AZURE_SEARCH_INDEX

echo ""
echo -e "${BLUE}Optional Secrets (press Enter to skip):${NC}"
read -p "AZURE_OPENAI_REALTIME_VOICE_CHOICE [alloy]: " AZURE_OPENAI_REALTIME_VOICE_CHOICE
read -p "AZURE_SEARCH_SEMANTIC_CONFIGURATION: " AZURE_SEARCH_SEMANTIC_CONFIGURATION
read -p "AZURE_SEARCH_IDENTIFIER_FIELD [chunk_id]: " AZURE_SEARCH_IDENTIFIER_FIELD
read -p "AZURE_SEARCH_CONTENT_FIELD [chunk]: " AZURE_SEARCH_CONTENT_FIELD
read -p "AZURE_SEARCH_EMBEDDING_FIELD [text_vector]: " AZURE_SEARCH_EMBEDDING_FIELD
read -p "AZURE_SEARCH_TITLE_FIELD [title]: " AZURE_SEARCH_TITLE_FIELD
read -p "AZURE_SEARCH_USE_VECTOR_QUERY [true]: " AZURE_SEARCH_USE_VECTOR_QUERY

echo ""
echo -e "${YELLOW}Creating GitHub repository secrets...${NC}"

# Create required secrets
if [ -n "$AZURE_OPENAI_API_KEY" ]; then
    echo "Setting AZURE_OPENAI_API_KEY..."
    echo "$AZURE_OPENAI_API_KEY" | gh secret set AZURE_OPENAI_API_KEY
fi

if [ -n "$AZURE_SEARCH_API_KEY" ]; then
    echo "Setting AZURE_SEARCH_API_KEY..."
    echo "$AZURE_SEARCH_API_KEY" | gh secret set AZURE_SEARCH_API_KEY
fi

if [ -n "$AZURE_OPENAI_ENDPOINT" ]; then
    echo "Setting AZURE_OPENAI_ENDPOINT..."
    echo "$AZURE_OPENAI_ENDPOINT" | gh secret set AZURE_OPENAI_ENDPOINT
fi

if [ -n "$AZURE_OPENAI_REALTIME_DEPLOYMENT" ]; then
    echo "Setting AZURE_OPENAI_REALTIME_DEPLOYMENT..."
    echo "$AZURE_OPENAI_REALTIME_DEPLOYMENT" | gh secret set AZURE_OPENAI_REALTIME_DEPLOYMENT
fi

if [ -n "$AZURE_SEARCH_ENDPOINT" ]; then
    echo "Setting AZURE_SEARCH_ENDPOINT..."
    echo "$AZURE_SEARCH_ENDPOINT" | gh secret set AZURE_SEARCH_ENDPOINT
fi

if [ -n "$AZURE_SEARCH_INDEX" ]; then
    echo "Setting AZURE_SEARCH_INDEX..."
    echo "$AZURE_SEARCH_INDEX" | gh secret set AZURE_SEARCH_INDEX
fi

# Create optional secrets (only if provided)
if [ -n "$AZURE_OPENAI_REALTIME_VOICE_CHOICE" ]; then
    echo "Setting AZURE_OPENAI_REALTIME_VOICE_CHOICE..."
    echo "$AZURE_OPENAI_REALTIME_VOICE_CHOICE" | gh secret set AZURE_OPENAI_REALTIME_VOICE_CHOICE
fi

if [ -n "$AZURE_SEARCH_SEMANTIC_CONFIGURATION" ]; then
    echo "Setting AZURE_SEARCH_SEMANTIC_CONFIGURATION..."
    echo "$AZURE_SEARCH_SEMANTIC_CONFIGURATION" | gh secret set AZURE_SEARCH_SEMANTIC_CONFIGURATION
fi

if [ -n "$AZURE_SEARCH_IDENTIFIER_FIELD" ]; then
    echo "Setting AZURE_SEARCH_IDENTIFIER_FIELD..."
    echo "$AZURE_SEARCH_IDENTIFIER_FIELD" | gh secret set AZURE_SEARCH_IDENTIFIER_FIELD
fi

if [ -n "$AZURE_SEARCH_CONTENT_FIELD" ]; then
    echo "Setting AZURE_SEARCH_CONTENT_FIELD..."
    echo "$AZURE_SEARCH_CONTENT_FIELD" | gh secret set AZURE_SEARCH_CONTENT_FIELD
fi

if [ -n "$AZURE_SEARCH_EMBEDDING_FIELD" ]; then
    echo "Setting AZURE_SEARCH_EMBEDDING_FIELD..."
    echo "$AZURE_SEARCH_EMBEDDING_FIELD" | gh secret set AZURE_SEARCH_EMBEDDING_FIELD
fi

if [ -n "$AZURE_SEARCH_TITLE_FIELD" ]; then
    echo "Setting AZURE_SEARCH_TITLE_FIELD..."
    echo "$AZURE_SEARCH_TITLE_FIELD" | gh secret set AZURE_SEARCH_TITLE_FIELD
fi

if [ -n "$AZURE_SEARCH_USE_VECTOR_QUERY" ]; then
    echo "Setting AZURE_SEARCH_USE_VECTOR_QUERY..."
    echo "$AZURE_SEARCH_USE_VECTOR_QUERY" | gh secret set AZURE_SEARCH_USE_VECTOR_QUERY
fi

echo -e "${GREEN}✅ Application secrets have been successfully created!${NC}"

# List all secrets
echo -e "\n${YELLOW}Current repository secrets:${NC}"
gh secret list

echo -e "\n${GREEN}🎉 Setup complete!${NC}"
echo -e "${YELLOW}Your Docker image will be built WITHOUT embedded secrets.${NC}"
echo -e "${YELLOW}Secrets will be injected at runtime when you deploy the container.${NC}"
