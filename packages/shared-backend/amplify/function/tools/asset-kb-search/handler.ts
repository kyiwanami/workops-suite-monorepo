import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";
import { env } from "$amplify/env/asset-kb-search";

const client = new BedrockAgentRuntimeClient({
  region: env.AWS_REGION,
});

export const handler = async (event: { query: string }) => {
  const { query } = event;

  const command = new RetrieveCommand({
    knowledgeBaseId: env.KNOWLEDGE_BASE_ID,
    retrievalQuery: {
      text: query,
    },
    retrievalConfiguration: {
      vectorSearchConfiguration: {
        numberOfResults: 5,
      },
    },
  });

  const response = await client.send(command);

  const results =
    response.retrievalResults?.map((result) => ({
      text: result.content?.text,
      source: result.location?.s3Location?.uri,
      score: result.score,
    })) || [];

  return { data: { results } };
};
