import type { ResourcesConfig } from "aws-amplify";

type AmplifyOutputs = ResourcesConfig & {
  custom?: {
    agentCoreRuntimeArn?: string;
  };
};

let outputs: AmplifyOutputs = {};

export async function loadAmplifyConfig(): Promise<ResourcesConfig> {
  try {
    const res = await fetch("/amplify_outputs.json");
    if (!res.ok) return {};
    outputs = (await res.json()) as AmplifyOutputs;
    return outputs;
  } catch {
    return {};
  }
}

const LOCAL_MCP_ENDPOINT = "http://localhost:8080/mcp";

// Pure function — exported for testing.
export function deriveEndpoint(
  arn: string | undefined,
  overrideUrl?: string,
): { url: string; requiresAuth: boolean } {
  if (overrideUrl) return { url: overrideUrl, requiresAuth: false };
  if (!arn) return { url: LOCAL_MCP_ENDPOINT, requiresAuth: false };
  const region = arn.split(":")[3];
  return {
    url: `https://bedrock-agentcore.${region}.amazonaws.com/runtimes/${encodeURIComponent(arn)}/invocations`,
    requiresAuth: true,
  };
}

// Derives the AgentCore Runtime endpoint from the deployed runtime ARN in
// amplify_outputs.json. Falls back to the local MCP server when the backend
// has not been deployed (e.g. during development).
// VITE_MCP_ENDPOINT overrides everything — use it to force local server mode
// even when amplify_outputs.json is present.
export function getMcpEndpoint(): { url: string; requiresAuth: boolean } {
  const override = import.meta.env.VITE_MCP_ENDPOINT as string | undefined;
  return deriveEndpoint(outputs.custom?.agentCoreRuntimeArn, override);
}
