import * as path from "node:path";
import { defineBackend } from "@aws-amplify/backend";
import {
  AgentRuntimeArtifact,
  ProtocolType,
  Runtime,
  RuntimeAuthorizerConfiguration,
  RuntimeNetworkConfiguration,
} from "aws-cdk-lib/aws-bedrockagentcore";
import { Stack } from "aws-cdk-lib";
import {
  CfnManagedLoginBranding,
  type CfnUserPoolDomain,
  ManagedLoginVersion,
  type UserPoolDomain,
} from "aws-cdk-lib/aws-cognito";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { auth } from "./auth/resource.ts";

const backend = defineBackend({ auth });

// defineAuth creates a Classic Hosted UI domain by default. Upgrade it to
// Managed Login v2 (newer UI) via L1 override — Cognito allows only one
// domain per user pool, so we can't create a second one.
const userPoolDomain = backend.auth.resources.userPool.node.findChild(
  "UserPoolDomain",
) as UserPoolDomain;
const cfnUserPoolDomain = userPoolDomain.node.defaultChild as CfnUserPoolDomain;
cfnUserPoolDomain.managedLoginVersion = ManagedLoginVersion.NEWER_MANAGED_LOGIN;

// Managed Login v2 requires a branding style; useCognitoProvidedValues applies
// the default style so the login page renders correctly out of the box.
new CfnManagedLoginBranding(
  Stack.of(backend.auth.resources.userPool),
  "ManagedLoginBranding",
  {
    userPoolId: backend.auth.resources.userPool.userPoolId,
    clientId: backend.auth.resources.userPoolClient.userPoolClientId,
    useCognitoProvidedValues: true,
  },
);

const agentStack = backend.createStack("AgentCoreStack");

// Suffix the runtime name with the Amplify backend name (branch or sandbox ID)
// to avoid collisions when multiple environments share the same account/region.
const backendName = (
  (agentStack.node.tryGetContext("amplify-backend-name") as
    | string
    | undefined) ?? "sandbox"
).replace(/[^a-zA-Z0-9_]/g, "_");

const runtime = new Runtime(agentStack, "SampleAgentRuntime", {
  runtimeName: `sample_agent_${backendName}`,
  agentRuntimeArtifact: AgentRuntimeArtifact.fromAsset(
    path.join(import.meta.dirname, "..", "server"),
  ),
  networkConfiguration: RuntimeNetworkConfiguration.usingPublicNetwork(),
  protocolConfiguration: ProtocolType.MCP,
  // Inbound auth via Cognito JWT — the browser sends
  // "Authorization: Bearer <accessToken>" directly, no SigV4 needed.
  authorizerConfiguration: RuntimeAuthorizerConfiguration.usingCognito(
    backend.auth.resources.userPool,
    [backend.auth.resources.userPoolClient],
  ),
  environmentVariables: {
    PORT: "8000",
    AWS_REGION: "ap-northeast-1",
  },
});

runtime.role.addToPrincipalPolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ["bedrock:InvokeModel", "bedrock:Converse"],
    resources: ["*"],
  }),
);

// Export ARN so the frontend can derive the AgentCore endpoint URL.
backend.addOutput({
  custom: {
    agentCoreRuntimeArn: runtime.agentRuntimeArn,
  },
});
