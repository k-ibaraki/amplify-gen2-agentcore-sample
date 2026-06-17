import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { fetchAuthSession } from "aws-amplify/auth";
import { useEffect, useRef, useState } from "react";
import { getMcpEndpoint } from "../amplify-config";

// AgentCore Runtime uses a Cognito JWT authorizer, so each request just carries
// the user's access token — no SigV4 signing needed.
// fetchAuthSession() transparently refreshes expired tokens.
function createBearerFetch(): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const session = await fetchAuthSession();
    const token = session.tokens?.accessToken?.toString();
    if (!token) {
      throw new Error("[MCP] No access token — user may not be signed in");
    }
    const headers = new Headers(init?.headers);
    headers.set("authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  };
}

export function useMcpClient() {
  const clientRef = useRef<Client | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const connect = async () => {
      const { url: mcpServerUrl, requiresAuth } = getMcpEndpoint();
      try {
        const client = new Client({
          name: "SampleAgentHost",
          version: "1.0.0",
        });
        // AgentCore returns 405 for GET SSE requests (POST-only).
        // maxRetries:0 stops the SDK from retrying after the connection attempt.
        const transport = new StreamableHTTPClientTransport(
          new URL(mcpServerUrl),
          requiresAuth
            ? {
                fetch: createBearerFetch(),
                reconnectionOptions: {
                  maxRetries: 0,
                  maxReconnectionDelay: 0,
                  initialReconnectionDelay: 0,
                  reconnectionDelayGrowFactor: 1,
                },
              }
            : undefined,
        );
        await client.connect(transport);
        if (!cancelled) {
          clientRef.current = client;
          setConnected(true);
        }
      } catch (e) {
        console.error("[MCP] Connection failed:", e);
      }
    };

    connect();
    return () => {
      cancelled = true;
    };
  }, []);

  return { client: clientRef.current, connected };
}
