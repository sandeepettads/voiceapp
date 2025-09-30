#!/bin/bash
# Script to add missing Docker/Artifactory secrets for GitHub Actions
# Based on analysis of working enterprise repositories

echo "🔐 Adding Missing Docker/Artifactory Secrets to GitHub Repository"
echo "================================================="

# Repository info
REPO="optum-labs/openai-rag-audio-aisearch"

echo "📋 Required secrets based on working enterprise reference:"
echo ""

# Check if secrets already exist
echo "🔍 Checking current secrets..."
gh secret list

echo ""
echo "❌ Missing secrets that need to be added:"
echo ""
echo "1. JF_PULL_TOKEN         - JFrog/Artifactory token for pulling images"
echo "2. JF_PUSH_TOKEN         - JFrog/Artifactory token for pushing images"  
echo "3. ACR_USER              - Container registry username"
echo "4. ACR_PASSWORD_NONPROD  - Container registry password (optional)"
echo ""

echo "🚨 IMPORTANT: You need to get these credentials from your IT/DevOps team"
echo ""

read -p "Do you have the JFrog/Artifactory credentials? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📝 Please provide the following credentials:"
    echo ""
    
    echo -n "JF_PULL_TOKEN (for pulling from docker.repo1.uhc.com): "
    read -s JF_PULL_TOKEN
    echo ""
    
    echo -n "JF_PUSH_TOKEN (for pushing to docker.repo1.uhc.com): "
    read -s JF_PUSH_TOKEN
    echo ""
    
    echo -n "ACR_USER (registry username): "
    read ACR_USER
    echo ""
    
    # Add secrets to GitHub
    echo "🔐 Adding secrets to GitHub repository..."
    
    gh secret set JF_PULL_TOKEN --body "$JF_PULL_TOKEN"
    gh secret set JF_PUSH_TOKEN --body "$JF_PUSH_TOKEN"  
    gh secret set ACR_USER --body "$ACR_USER"
    
    echo ""
    echo "✅ Secrets added successfully!"
    echo ""
    echo "📋 Updated secrets list:"
    gh secret list
    
else
    echo ""
    echo "📞 Please contact your IT/DevOps team to get:"
    echo "   - JFrog Artifactory pull token"
    echo "   - JFrog Artifactory push token" 
    echo "   - Docker registry username"
    echo ""
    echo "🔗 Reference working repository: optum-rx-consumer-digital/osmm-isdm-ui"
    echo "   This repo has the same secrets configured and working"
    echo ""
    echo "Once you have the credentials, run this script again."
fi

echo ""
echo "🔄 Next step: Update the workflow to use the new secrets"
