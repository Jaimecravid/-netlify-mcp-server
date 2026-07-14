# DigitalZango Netlify Model Context Protocol (MCP) Server 🌐🤖

A custom Model Context Protocol (MCP) server built with **TypeScript** and **Node.js** using the official `@modelcontextprotocol/sdk`. 

This server acts as an intelligent CI/CD and DevOps bridge, empowering LLM agents (such as Claude Desktop, Cursor, or ChatGPT) to monitor, optimize, and programmatically manage Netlify hosting infrastructure. Beyond standard API endpoints, this implementation includes custom diagnostic, performance analysis, and optimization tools tailored for AI-driven development workflows.

---

## 🛠️ Tech Stack & Architecture

* **Language & Runtime:** TypeScript, Node.js (v22.15+)
* **Protocol:** Model Context Protocol (MCP) SDK
* **API Integration:** Netlify REST API
* **Target OS Environment:** Windows 11 (fully configured for sandboxed AppData environments)

---

## 🔌 Exposed Tools

The server registers and exposes a suite of 14 tools to connected AI models, categorized below:

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
🖥️ Claude Desktop Integration
To register this local server with Claude Desktop on Windows, you must configure the client config file.
1. Locate Your Configuration File
Depending on how Claude Desktop was installed, its config directory varies:
Standard Installation Path:
%APPDATA%\Claude\claude_desktop_config.json
MSIX (Windows Store) Installation Path:
%LOCALAPPDATA%\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude_desktop_config.json
2. Configure claude_desktop_config.json
Add the server definition under the "mcpServers" block.
Note: On Windows, pass security tokens directly in the "env" schema within this JSON, rather than relying solely on local directory .env files, to satisfy Windows sandboxing requirements.
code
JSON
{
  "mcpServers": {
    "netlify-mcp-server": {
      "command": "node",
      "args": [
        "C:\\Users\\YOUR_USER\\Downloads\\netlify-mcp-server\\dist\\index.js"
      ],
      "env": {
        "NETLIFY_PERSONAL_ACCESS_TOKEN": "YOUR_NETLIFY_PERSONAL_ACCESS_TOKEN",
        "NETLIFY_API_TOKEN": "YOUR_NETLIFY_PERSONAL_ACCESS_TOKEN",
        "NETLIFY_ACCESS_TOKEN": "YOUR_NETLIFY_PERSONAL_ACCESS_TOKEN",
        "NETLIFY_AUTH_TOKEN": "YOUR_NETLIFY_PERSONAL_ACCESS_TOKEN",
        "NETLIFY_TOKEN": "YOUR_NETLIFY_PERSONAL_ACCESS_TOKEN"
      }
    }
  }
}
🔌 Verifying the Connection in Claude Desktop
Once configured, you can verify that Claude Desktop has successfully loaded your local MCP server:
Open Claude Desktop.
Click the + (Add) button next to the input box.
Hover over Connectors.
You should see netlify-mcp-server listed. Ensure the toggle next to it is turned ON.
Test the integration by typing a prompt like:
"Can you read my Netlify sites?"
Claude will search for the available tools, run the list-sites tool exposed by your local server, and return your active deployments.
🛡️ Case Study: Resolving the Windows MSIX Sandbox Conflict
The Challenge
During initial testing of the integration, the server threw continuous 401 Unauthorized responses from the Netlify API, despite having valid API tokens specified in a local .env file within the repository directory.
The Diagnosis
Using PowerShell debugging scripts and system execution trace logs, we identified that Claude Desktop was running inside a sandboxed Windows MSIX package environment (Claude_pzs8sxrjxfjjc).
The sandboxed Claude runtime initiated the server process as a child process but isolated its working directory context.
The server's dependency on dotenv was silently failing to locate the localized root .env file due to the sandboxed path resolution mechanics.
This caused the local server to fall back to uninitialized environmental variables, resulting in unauthorized requests.
The Resolution
We resolved this sandbox constraint by:
Verifying Netlify API connectivity independently using target PowerShell API calls to prove token validity.
Direct-mapping all Netlify token naming conventions (NETLIFY_TOKEN, NETLIFY_API_TOKEN, etc.) inside the env block of the claude_desktop_config.json schema. This forced the sandboxed child-process generator to cleanly inject the authenticated credentials directly into the execution context.
Safely cleaning up stale, redundant .env files to prevent future path resolution conflicts.
