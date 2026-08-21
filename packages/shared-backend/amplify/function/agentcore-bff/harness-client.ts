import { BedrockAgentCoreClient } from "@aws-sdk/client-bedrock-agentcore";
import { HttpBearerAuthSigner } from "@smithy/core";
import type {
  HttpAuthOption,
  HttpAuthScheme,
  TokenIdentity,
} from "@smithy/types";

const bearerSchemeId = "smithy.api#httpBearerAuth";

/** 生成済みAgentCore clientのevent stream decoderを維持し、BearerでHarnessを呼ぶ。 */
export function createBearerHarnessClient(token: string): BedrockAgentCoreClient {
  const tokenProvider = async (): Promise<TokenIdentity> => ({ token });
  const authScheme: HttpAuthScheme = {
    schemeId: bearerSchemeId,
    identityProvider: () => tokenProvider,
    signer: new HttpBearerAuthSigner(),
  };
  const authOptions: HttpAuthOption[] = [{ schemeId: bearerSchemeId }];
  return new BedrockAgentCoreClient({
    authSchemePreference: ["httpBearerAuth"],
    httpAuthSchemes: [authScheme],
    httpAuthSchemeProvider: () => authOptions,
  });
}
