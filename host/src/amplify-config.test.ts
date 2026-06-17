import { describe, expect, it } from "vitest";
import { deriveEndpoint } from "./amplify-config";

describe("deriveEndpoint", () => {
  const sampleArn =
    "arn:aws:bedrock-agentcore:ap-northeast-1:123456789012:runtime/sample_agent_main";

  it("overrideUrl が指定された場合はそれを返し、認証不要とする", () => {
    const result = deriveEndpoint(sampleArn, "http://localhost:8080/mcp");
    expect(result).toEqual({
      url: "http://localhost:8080/mcp",
      requiresAuth: false,
    });
  });

  it("ARN がない場合はローカルフォールバック URL を返す", () => {
    const result = deriveEndpoint(undefined);
    expect(result).toEqual({
      url: "http://localhost:8080/mcp",
      requiresAuth: false,
    });
  });

  it("ARN からリージョンを抽出して AgentCore エンドポイント URL を構築する", () => {
    const result = deriveEndpoint(sampleArn);
    expect(result.requiresAuth).toBe(true);
    expect(result.url).toContain("bedrock-agentcore.ap-northeast-1.amazonaws.com");
    expect(result.url).toContain("/invocations");
  });

  it("ARN の `:` と `/` が URL エンコードされる", () => {
    const result = deriveEndpoint(sampleArn);
    expect(result.url).not.toContain("arn:aws");
    expect(result.url).toContain("arn%3Aaws");
  });

  it("異なるリージョンの ARN を正しく処理する", () => {
    const usEastArn =
      "arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/sample_agent";
    const result = deriveEndpoint(usEastArn);
    expect(result.url).toContain("bedrock-agentcore.us-east-1.amazonaws.com");
  });
});
