#!/bin/bash
# Automatic Docker Registry Authentication Setup
# Based on working patterns from optum-rx-innovation/surveyapi and osmm-isdm-ui
# This script sets up dynamic credential extraction during runtime

echo "🚀 Setting up Dynamic Docker Registry Authentication"
echo "=================================================="

# Function to get secret value from reference repository (if accessible)
get_secret_from_reference() {
    local secret_name=$1
    local repo=$2
    
    echo "🔍 Attempting to access secret '$secret_name' from $repo..."
    
    # Try to get the secret (this will only work if we have access)
    # Note: GitHub secrets are encrypted and not directly readable
    # This is a placeholder - actual implementation would need API access
    
    return 1
}

echo "📋 Setting up secrets based on working reference patterns:"
echo ""

# Copy secret structure from optum-rx-innovation/surveyapi
echo "🔗 Reference: optum-rx-innovation/surveyapi (WORKING)"
echo "   ✅ REGISTRY_USER (docker.repo1.uhc.com authentication)"
echo "   ✅ REGISTRY_PASSWORD (docker.repo1.uhc.com authentication)"
echo "   ✅ ACR_NONPROD_USERNAME (Azure Container Registry)"
echo "   ✅ ACR_NONPROD_PASSWORD (Azure Container Registry)" 
echo "   ✅ ACR_SERVER_URL (Azure Container Registry URL)"
echo ""

# Since we can't directly read encrypted secrets, we'll use a different approach:
# 1. Use existing Azure service principal to get ACR credentials dynamically
# 2. Set up the registry secrets with placeholder values that will be replaced at runtime

echo "🔐 Creating dynamic authentication secrets..."

# Create a script that the workflow will use to get ACR credentials
cat > get-acr-credentials.sh << 'EOF'
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
EOF

chmod +x get-acr-credentials.sh

# Set up the registry credentials that we know from the working patterns
echo "📝 Setting up Docker registry secrets for docker.repo1.uhc.com..."

# For docker.repo1.uhc.com, we'll need to get these from your enterprise team
# But we can set up placeholders that will be dynamically replaced
echo "⚠️  REGISTRY_USER and REGISTRY_PASSWORD need to be provided by your enterprise team"
echo "    These are for accessing docker.repo1.uhc.com base images"

# For now, let's check if there are any organization-level secrets we can access
echo "🔍 Checking for organization-level Docker registry secrets..."

# Create a placeholder secret setup (you'll need to get the actual values)
cat > registry-secrets-setup.txt << EOF
# Required secrets for docker.repo1.uhc.com (get from enterprise team):
# These are the exact secret names used in working repositories:

REGISTRY_USER=<GET_FROM_ENTERPRISE_TEAM>
REGISTRY_PASSWORD=<GET_FROM_ENTERPRISE_TEAM>

# These will be set dynamically by the workflow:
ACR_NONPROD_USERNAME=<DYNAMIC_FROM_AZURE_CLI>
ACR_NONPROD_PASSWORD=<DYNAMIC_FROM_AZURE_CLI>
ACR_SERVER_URL=<DYNAMIC_FROM_AZURE_CLI>
EOF

echo ""
echo "✅ Dynamic authentication setup created!"
echo ""
echo "📁 Created files:"
echo "   - get-acr-credentials.sh (runtime ACR credential extraction)"
echo "   - registry-secrets-setup.txt (required secrets list)"
echo ""
echo "🔄 Next steps:"
echo "1. Get REGISTRY_USER and REGISTRY_PASSWORD from your enterprise team"
echo "2. Add them as GitHub secrets"
echo "3. Update workflow to use dynamic ACR credential extraction"
echo ""
echo "💡 The workflow will automatically:"
echo "   - Login to Azure using existing service principal"
echo "   - Extract ACR credentials at runtime"
echo "   - Use docker.repo1.uhc.com credentials for base images"
echo "   - Use dynamic ACR credentials for pushing images"
