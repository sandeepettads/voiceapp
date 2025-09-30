# GitHub Secrets Setup for Azure Credentials

This directory contains scripts to programmatically push Azure credentials to GitHub repository secrets, ensuring secure CI/CD workflows without storing sensitive data in the repository.

## Prerequisites

### For GitHub CLI approach (Option 1 - Recommended):
```bash
# Install GitHub CLI
brew install gh

# Install jq for JSON parsing
brew install jq

# Authenticate with GitHub
gh auth login
```

### For Python API approach (Option 2):
```bash
# Install required Python packages
pip install requests cryptography PyNaCl
```

## Setup Methods

### Option 1: Using GitHub CLI (Recommended)

```bash
# Make the script executable
chmod +x scripts/setup-github-secrets.sh

# Run the script
./scripts/setup-github-secrets.sh
```

### Option 2: Using Python with GitHub API

```bash
# Make the script executable
chmod +x scripts/setup-github-secrets.py

# Set GitHub token (optional - script will prompt if not set)
export GITHUB_TOKEN="your_github_personal_access_token"

# Run the script
python3 scripts/setup-github-secrets.py
```

## Required GitHub Personal Access Token Permissions

Your GitHub Personal Access Token needs the following scopes:
- `repo` (Full control of private repositories)
- `workflow` (Update GitHub Action workflows)

## Expected Azure Credentials Format

The script expects a JSON file at `/Enterprisestandard/azurecredentials.json` with the following structure:

```json
{
  "clientId": "your-service-principal-client-id",
  "clientSecret": "your-service-principal-client-secret",
  "tenantId": "your-azure-tenant-id",
  "subscriptionId": "your-azure-subscription-id"
}
```

The script also supports alternative field names:
- `client_id`, `appId` for clientId
- `client_secret`, `password` for clientSecret
- `tenant_id`, `tenant` for tenantId
- `subscription_id`, `subscription` for subscriptionId

## Created Secrets

The scripts will create the following repository secrets:
- `AZURE_CLIENT_ID`
- `AZURE_CLIENT_SECRET`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

## Security Features

- ✅ Credentials are encrypted before being sent to GitHub
- ✅ Sensitive values are masked in GitHub Actions logs
- ✅ No credentials are stored in the repository
- ✅ Automatic validation of required fields
- ✅ Proper error handling and rollback

## Workflow Features

The GitHub Actions workflow (`../.github/workflows/build-and-deploy.yml`) includes:

- ✅ Docker image building for x86-64 (amd64) architecture
- ✅ Azure authentication using service principal
- ✅ Container registry login
- ✅ Multi-platform Docker builds with caching
- ✅ Architecture verification
- ✅ Automatic tagging based on branch/PR/SHA
- ✅ Secure credential handling

## Troubleshooting

### Common Issues:

1. **GitHub CLI not authenticated**: Run `gh auth login`
2. **Missing jq**: Install with `brew install jq`
3. **Invalid JSON**: Validate your credentials file format
4. **Token permissions**: Ensure your GitHub token has `repo` and `workflow` scopes
5. **Repository not found**: Make sure you're in the correct git repository directory

### Verifying Setup:

```bash
# Check if secrets were created successfully
gh secret list

# Test the workflow by pushing a commit
git add .
git commit -m "Update GitHub Actions workflow"
git push
```

## Next Steps After Setup

1. ✅ Run one of the setup scripts to create GitHub secrets
2. ✅ Add `/Enterprisestandard/azurecredentials.json` to your `.gitignore`
3. ✅ Remove any local copies of the credentials file from the repository
4. ✅ Test the workflow by pushing a commit or creating a pull request
