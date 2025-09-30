#!/bin/bash
# Dynamic ACR credential extraction script
# This runs during GitHub Actions workflow to get real ACR credentials

echo "🔐 Extracting ACR credentials using Azure CLI..."

# Login using existing service principal (already configured)
echo "✅ Azure login already completed in workflow"

# Get ACR credentials dynamically
ACR_NAME=$(az acr list --query "[0].name" -o tsv)
ACR_SERVER=$(az acr list --query "[0].loginServer" -o tsv)
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query "username" -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

# Export for use in workflow
echo "ACR_USERNAME=$ACR_USERNAME" >> $GITHUB_ENV
echo "ACR_PASSWORD=$ACR_PASSWORD" >> $GITHUB_ENV
echo "ACR_SERVER=$ACR_SERVER" >> $GITHUB_ENV

echo "✅ ACR credentials extracted successfully"
echo "   Server: $ACR_SERVER"
echo "   Username: $ACR_USERNAME"
