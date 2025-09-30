# Stage 1: Build the Vite app
# Using Chainguard Node.js image from enterprise registry (verified available tag)
FROM docker.repo1.uhc.com/orxcoreplatform/chainguard/node:24.4-latest AS build-stage

# Set the working directory and copy frontend files
WORKDIR /frontend
COPY ./frontend/ .
# Fix ownership for the non-root user in Chainguard
USER root
RUN chown -R node:node /frontend
USER node

# Configure npm authentication for JFrog Artifactory
# Create complete .npmrc file with authentication (avoids permission issues)
ARG NPM_TOKEN
RUN echo "registry=https://repo1.uhc.com/artifactory/api/npm/npm-virtual/" > .npmrc && \
    echo "@optum-mcp:registry=https://repo1.uhc.com/artifactory/api/npm/npm-virtual/" >> .npmrc && \
    echo "@optum-rx-skyline:registry=https://repo1.uhc.com/artifactory/api/npm/npm-virtual/" >> .npmrc && \
    echo "always-auth=true" >> .npmrc && \
    echo "//repo1.uhc.com/artifactory/api/npm/npm-virtual/:_authToken=${NPM_TOKEN}" >> .npmrc

RUN npm install
RUN npm run build

# Stage 2: Serve the built app with a static file server  
# Using Python slim image with pip and shell support from enterprise registry
FROM docker.repo1.uhc.com/python:3.12-slim AS production-stage

WORKDIR /app
COPY --from=build-stage /frontend/dist /app/static
COPY ./backend/ /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install Python dependencies
RUN python -m pip install -r requirements.txt
RUN python -m pip install gunicorn

CMD ["python3", "-m", "gunicorn", "app:create_app", "-b", "0.0.0.0:8000", "--worker-class", "aiohttp.GunicornWebWorker"]
