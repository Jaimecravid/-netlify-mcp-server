# DigitalZango Netlify Model Context Protocol (MCP) Server 🌐🤖

A high-performance, custom Model Context Protocol (MCP) server built with **TypeScript** and **Node.js** using the official `@modelcontextprotocol/sdk`. 

This server acts as an intelligent CI/CD and DevOps bridge, empowering LLM agents (such as Claude Desktop, Cursor, or ChatGPT) to monitor, optimize, and programmatically manage Netlify hosting infrastructure. Beyond standard API endpoints, this implementation includes custom diagnostic, performance analysis, and optimization tools tailored for AI-driven development workflows.

---

## 🛠️ Tech Stack & Architecture

* **Language & Runtime:** TypeScript, Node.js (v22.15+)
* **Protocol:** Model Context Protocol (MCP) SDK
* **API Integration:** Netlify REST API
* **Target OS Environment:** Windows 11 (fully configured for sandboxed AppData environments)

---

## 🔌 Exposed Tools

The server registers and exposes a powerful suite of 14 tools to connected AI models, categorized below:

### 1. Core Operations & Infrastructure Monitoring
* **`list-sites`**: Retrieves a detailed inventory of Netlify sites under the authenticated account.
* **`check-deployment-status`**: Inspects current deploy pipelines and build statuses.
* **`get-advanced-deployment-status`**: Pulls deep metadata for granular deploy troubleshooting.
* **`check-build-minutes`**: Monitors resource consumption and build-minute quotas to prevent unexpected pipeline freezes.

### 2. Intelligent Diagnostics & AI Orchestration
* **`get-failed-deployments`**: Scans deploy histories to isolate failed runs.
* **`get-build-metrics`**: Pulls analytical data on historical build performance and timing.
* **`analyze-build-error`**: Diagnoses the underlying root causes of compilation, configuration, or dependency failures.
* **`smart-retry-analysis`**: Assesses whether a failed pipeline should be retried immediately or if configuration changes are required.
* **`format-error-for-ai`**: Sanitizes and structures complex raw stack traces and build logs into token-optimized formats suitable for LLM reasoning.

### 3. Performance & Content Strategy
* **`optimize-build-strategy`**: Evaluates active build variables and caching behaviors to suggest speed optimizations.
* **`analyze-content-performance`**: Provides insights on static assets and deployment footprint.
* **`generate-content-optimization-report`**: Generates a comprehensive report with actionable suggestions for enhancing static-site generation performance.

### 4. Custom App Integrations
* **`monitor-digitalzango-calendar`**: A dedicated, application-specific monitoring tool tailored to track and manage deployments for the private *DigitalZango Agricultural Calendar* web application.

---

## 🚀 Setup & Installation (Windows)

### 1. Clone & Build the Server Locally
Ensure you have Node.js (v22.15+) and npm installed.

```bash
# Clone the repository
git clone https://github.com/Jaimecravid/-netlify-mcp-server.git
cd -netlify-mcp-server

# Install dependencies
npm install

# Build the TypeScript project
npm run build
