import { randomUUID } from "node:crypto";
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";
import express from "express";
import { z } from "zod";

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION ?? "ap-northeast-1",
});

const mcpTransports = new Map<string, StreamableHTTPServerTransport>();

function createServer(): McpServer {
  const server = new McpServer({ name: "sample-agent", version: "1.0.0" });

  server.registerTool(
    "ask",
    {
      description: "質問にLLMが回答します",
      inputSchema: { prompt: z.string() },
    },
    async ({ prompt }) => {
      const res = await bedrock.send(
        new ConverseCommand({
          modelId: "jp.anthropic.claude-sonnet-4-6",
          messages: [{ role: "user", content: [{ text: prompt }] }],
        }),
      );
      const text = res.output?.message?.content?.[0]?.text ?? "";
      return { content: [{ type: "text", text }] };
    },
  );

  return server;
}

const app = express();
app.use(cors({ exposedHeaders: ["Mcp-Session-Id"] }));
app.use(express.json());

app.post("/mcp", async (req, res) => {
  const raw = req.headers["mcp-session-id"];
  const existingSessionId = Array.isArray(raw) ? raw[0] : raw;

  if (existingSessionId && mcpTransports.has(existingSessionId)) {
    const transport = mcpTransports.get(existingSessionId);
    if (transport) await transport.handleRequest(req, res, req.body);
    return;
  }

  if (existingSessionId && !mcpTransports.has(existingSessionId)) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    enableJsonResponse: true,
    enableDnsRebindingProtection: false,
    onsessioninitialized: (sessionId) => {
      mcpTransports.set(sessionId, transport);
    },
  });

  transport.onclose = () => {
    if (transport.sessionId) mcpTransports.delete(transport.sessionId);
  };

  await createServer().connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get("/mcp", async (req, res) => {
  const raw = req.headers["mcp-session-id"];
  const sessionId = Array.isArray(raw) ? raw[0] : raw;
  if (sessionId && mcpTransports.has(sessionId)) {
    await mcpTransports.get(sessionId)?.handleRequest(req, res);
    return;
  }
  res.status(404).json({ error: "Session not found" });
});

app.delete("/mcp", async (req, res) => {
  const raw = req.headers["mcp-session-id"];
  const sessionId = Array.isArray(raw) ? raw[0] : raw;
  if (sessionId) {
    const transport = mcpTransports.get(sessionId);
    if (transport) {
      await transport.close().catch(() => {});
      mcpTransports.delete(sessionId);
    }
  }
  res.status(200).json({ ok: true });
});

const PORT = Number.parseInt(process.env.PORT ?? "8080", 10);
app.listen(PORT, () =>
  console.log(
    `Sample Agent MCP Server running on http://localhost:${PORT}/mcp`,
  ),
);
