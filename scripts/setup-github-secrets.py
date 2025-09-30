#!/usr/bin/env python3

"""
Script to push Azure credentials to GitHub repository secrets using GitHub API
Requires: requests, cryptography, PyNaCl
Install with: pip install requests cryptography PyNaCl
"""

import json
import os
import sys
import base64
import requests
from nacl import encoding, public

def get_github_token():
    """Get GitHub token from environment or prompt user"""
    token = os.environ.get('GITHUB_TOKEN')
    if not token:
        token = input("Enter your GitHub Personal Access Token: ").strip()
    return token

def get_repo_info():
    """Extract repository owner and name from git remote"""
    try:
        import subprocess
        result = subprocess.run(['git', 'remote', 'get-url', 'origin'], 
                              capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception("Failed to get git remote URL")
        
        url = result.stdout.strip()
        # Handle both SSH and HTTPS URLs
        if url.startswith('git@github.com:'):
            repo_path = url.replace('git@github.com:', '').replace('.git', '')
        elif 'github.com' in url:
            repo_path = url.split('github.com/')[-1].replace('.git', '')
        else:
            raise Exception("Not a GitHub repository")
        
        owner, repo = repo_path.split('/')
        return owner, repo
    except Exception as e:
        print(f"Error getting repository info: {e}")
        owner = input("Enter repository owner: ").strip()
        repo = input("Enter repository name: ").strip()
        return owner, repo

def encrypt_secret(public_key: str, secret_value: str) -> str:
    """Encrypt a Unicode string using the repository's public key"""
    public_key_bytes = base64.b64decode(public_key)
    sealed_box = public.SealedBox(public.PublicKey(public_key_bytes))
    encrypted = sealed_box.encrypt(secret_value.encode("utf-8"))
    return base64.b64encode(encrypted).decode("utf-8")

def get_public_key(token: str, owner: str, repo: str):
    """Get the repository's public key for encryption"""
    url = f"https://api.github.com/repos/{owner}/{repo}/actions/secrets/public-key"
    headers = {
        'Authorization': f'token {token}',
        'Accept': 'application/vnd.github.v3+json'
    }
    
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Failed to get public key: {response.status_code} - {response.text}")
    
    return response.json()

def create_secret(token: str, owner: str, repo: str, secret_name: str, secret_value: str, public_key_data: dict):
    """Create or update a repository secret"""
    url = f"https://api.github.com/repos/{owner}/{repo}/actions/secrets/{secret_name}"
    headers = {
        'Authorization': f'token {token}',
        'Accept': 'application/vnd.github.v3+json'
    }
    
    encrypted_value = encrypt_secret(public_key_data['key'], secret_value)
    
    data = {
        'encrypted_value': encrypted_value,
        'key_id': public_key_data['key_id']
    }
    
    response = requests.put(url, headers=headers, json=data)
    if response.status_code not in [201, 204]:
        raise Exception(f"Failed to create secret {secret_name}: {response.status_code} - {response.text}")
    
    return response.status_code == 201  # True if created, False if updated

def main():
    credentials_file = "/Enterprisestandard/azurecredentials.json"
    
    print("🔐 GitHub Secrets Setup Tool")
    print("=" * 40)
    
    # Check if credentials file exists
    if not os.path.exists(credentials_file):
        print(f"❌ Error: Azure credentials file not found at {credentials_file}")
        sys.exit(1)
    
    try:
        # Read credentials
        print(f"📖 Reading credentials from {credentials_file}...")
        with open(credentials_file, 'r') as f:
            creds = json.load(f)
        
        # Extract credentials with fallback field names
        client_id = creds.get('clientId') or creds.get('client_id') or creds.get('appId')
        client_secret = creds.get('clientSecret') or creds.get('client_secret') or creds.get('password')
        tenant_id = creds.get('tenantId') or creds.get('tenant_id') or creds.get('tenant')
        subscription_id = creds.get('subscriptionId') or creds.get('subscription_id') or creds.get('subscription')
        
        # Validate credentials
        missing_fields = []
        if not client_id:
            missing_fields.append('clientId/client_id/appId')
        if not client_secret:
            missing_fields.append('clientSecret/client_secret/password')
        if not tenant_id:
            missing_fields.append('tenantId/tenant_id/tenant')
        if not subscription_id:
            missing_fields.append('subscriptionId/subscription_id/subscription')
        
        if missing_fields:
            print(f"❌ Error: Missing required fields: {', '.join(missing_fields)}")
            sys.exit(1)
        
        print("✅ Successfully validated all credentials")
        
        # Get GitHub token and repo info
        token = get_github_token()
        owner, repo = get_repo_info()
        
        print(f"🔍 Target repository: {owner}/{repo}")
        
        # Get public key for encryption
        print("🔑 Getting repository public key...")
        public_key_data = get_public_key(token, owner, repo)
        
        # Create secrets
        secrets_to_create = [
            ('AZURE_CLIENT_ID', client_id),
            ('AZURE_CLIENT_SECRET', client_secret),
            ('AZURE_TENANT_ID', tenant_id),
            ('AZURE_SUBSCRIPTION_ID', subscription_id)
        ]
        
        print("\n🚀 Creating repository secrets...")
        for secret_name, secret_value in secrets_to_create:
            try:
                was_created = create_secret(token, owner, repo, secret_name, secret_value, public_key_data)
                status = "Created" if was_created else "Updated"
                print(f"✅ {status}: {secret_name}")
            except Exception as e:
                print(f"❌ Failed to create {secret_name}: {e}")
                sys.exit(1)
        
        print("\n🎉 All secrets have been successfully configured!")
        print("\n📝 Next steps:")
        print("1. Update your GitHub Actions workflow to use these secrets")
        print("2. Remove the credentials file from your local repository")
        print("3. Add the credentials file path to .gitignore")
        
    except json.JSONDecodeError as e:
        print(f"❌ Error: Invalid JSON in credentials file: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
