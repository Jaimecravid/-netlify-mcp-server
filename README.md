# Netlify Model Context Protocol (MCP) Server 🌐🤖

A custom Model Context Protocol (MCP) server built with **TypeScript** and **Node.js** that enables LLM agents (like Claude Desktop, Cursor, or ChatGPT) to interact directly with Netlify's web deployment infrastructure. 

This project bridges the gap between autonomous AI development and hosting, allowing AI agents to manage projects, inspect deploys, and trigger builds using natural language.

---

## 🚀 Key Features & Tools Exposed
This server implements the official `@modelcontextprotocol/sdk` to expose secure, state-of-the-art tools to AI clients:
- **Site Management:** Allow AI agents to fetch, list, and read settings for sites deployed on Netlify.
- **Deployment Control:** Enables agents to inspect deployment history, read build logs to debug issues, and trigger new production builds.
- **Environment Management:** Exposes tools for managing environment variables and site configurations programmatically.

---

## 🛠️ Tech Stack
- **Runtime & Language:** Node.js (v22.15+) & TypeScript
- **Protocol:** Model Context Protocol (MCP) SDK
- **API Integration:** Netlify REST API

---

## 📦 Setup & Installation

### 1. Configure Environment Variables
Create a `.env` file in the root directory based on the `.env.example` file:
```bash
NETLIFY_API_TOKEN=your_personal_access_token_here
