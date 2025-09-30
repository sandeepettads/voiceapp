# Security Guide: Handling Secrets in Docker Deployments

## 🎯 **The Problem You Asked About**

Your application needs Azure service secrets (API keys, endpoints, etc.) to function, but embedding these secrets directly in Docker images creates serious security risks.

## ❌ **What NOT to Do (Security Anti-Patterns)**

```dockerfile
# DON'T DO THIS - Embeds secrets in image layers
COPY .env /app/.env              # ❌ Secrets visible in image
ENV AZURE_OPENAI_API_KEY=secret  # ❌ Secrets in image history
RUN echo "secret" > /app/config  # ❌ Secrets in build logs
```

## ✅ **Secure Solution: Runtime Environment Injection**

Your application is **already designed securely**! Here's why:

```python path=/Users/sandeep.etta@optum.com/CascadeProjects/aispeech/x86/openai-rag-audio-aisearch/app/backend/app.py start=16
async def create_app():
    if not os.environ.get("RUNNING_IN_PRODUCTION"):
        logger.info("Running in development mode, loading from .env file")
        load_dotenv()  # Only loads .env in development

    llm_key = os.environ.get("AZURE_OPENAI_API_KEY")  # ✅ Reads from environment
    search_key = os.environ.get("AZURE_SEARCH_API_KEY")  # ✅ Runtime configuration
```

## 🔒 **How Secrets are Handled Securely**

### 1. **Build Time (GitHub Actions)**
- ✅ Docker image is built **WITHOUT any secrets**
- ✅ Image contains only application code and dependencies
- ✅ Secrets stay in GitHub repository secrets (encrypted)

### 2. **Runtime (Container Deployment)**
- ✅ Secrets are injected as environment variables when container starts
- ✅ No secrets stored in image layers or filesystem
- ✅ Secrets exist only in container memory during runtime

## 🏗️ **Deployment Options**

### Option A: Docker Compose (Local/Development)
```yaml
# docker-compose.production.yml
services:
  app:
    image: your-registry/app:latest
    environment:
      - RUNNING_IN_PRODUCTION=true
      - AZURE_OPENAI_API_KEY=${AZURE_OPENAI_API_KEY}  # Injected at runtime
      - AZURE_SEARCH_API_KEY=${AZURE_SEARCH_API_KEY}  # From environment
```

### Option B: Kubernetes (Production)
```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
      - name: app
        image: your-registry/app:latest
        env:
        - name: RUNNING_IN_PRODUCTION
          value: "true"
        - name: AZURE_OPENAI_API_KEY
          valueFrom:
            secretKeyRef:              # ✅ From Kubernetes secrets
              name: azure-secrets
              key: openai-api-key
```

### Option C: Azure Container Apps
```bash
# Deploy with environment variables
az containerapp create \
  --name openai-rag-app \
  --image docker.repo1.uhc.com/openai-rag-audio-aisearch:latest \
  --environment-variables \
    "RUNNING_IN_PRODUCTION=true" \
    "AZURE_OPENAI_API_KEY=secretref:azure-openai-key" \
    "AZURE_SEARCH_API_KEY=secretref:azure-search-key"
```

## 🔐 **Secret Management Best Practices**

### ✅ **DO:**
- Use environment variables at runtime
- Use managed identity when possible (Azure, AWS, GCP)
- Use secret management services (Azure Key Vault, HashiCorp Vault)
- Rotate secrets regularly
- Use least privilege access
- Monitor secret access

### ❌ **DON'T:**
- Embed secrets in Docker images
- Store secrets in source code
- Log secret values
- Use plain text files in containers
- Share secrets across environments

## 🚀 **Your Current Setup (Already Secure!)**

1. ✅ **GitHub Secrets**: Authentication credentials stored securely
2. ✅ **Build Process**: Docker image contains NO secrets
3. ✅ **Application Code**: Uses environment variables properly
4. ✅ **Fallback Authentication**: Uses Azure DefaultAzureCredential

## 📋 **Required Environment Variables**

Your application expects these at **runtime** (not build time):

### Required:
- `AZURE_OPENAI_API_KEY`
- `AZURE_SEARCH_API_KEY`  
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_REALTIME_DEPLOYMENT`
- `AZURE_SEARCH_ENDPOINT`
- `AZURE_SEARCH_INDEX`

### Optional (with defaults):
- `AZURE_OPENAI_REALTIME_VOICE_CHOICE` (default: "alloy")
- `AZURE_SEARCH_SEMANTIC_CONFIGURATION`
- `AZURE_SEARCH_IDENTIFIER_FIELD` (default: "chunk_id")
- `AZURE_SEARCH_CONTENT_FIELD` (default: "chunk")
- `AZURE_SEARCH_EMBEDDING_FIELD` (default: "text_vector")
- `AZURE_SEARCH_TITLE_FIELD` (default: "title")
- `AZURE_SEARCH_USE_VECTOR_QUERY` (default: "true")

## 🎯 **Next Steps**

1. **Set up application secrets**: Run `./scripts/setup-app-secrets.sh`
2. **Deploy securely**: Use one of the deployment options above
3. **Test**: Verify your application works with injected secrets

## 🛡️ **Security Compliance**

This approach meets enterprise security requirements:
- ✅ **Zero Trust**: No secrets in images
- ✅ **Encryption**: Secrets encrypted in transit and at rest
- ✅ **Audit Trail**: Secret access is logged
- ✅ **Rotation**: Easy to rotate without rebuilding images
- ✅ **Principle of Least Privilege**: Secrets only where needed
