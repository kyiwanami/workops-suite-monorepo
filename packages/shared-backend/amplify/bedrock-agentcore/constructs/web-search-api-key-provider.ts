import { Construct } from "constructs";
import { CustomResource } from "aws-cdk-lib";
import type { IFunction } from "aws-cdk-lib/aws-lambda";
import { PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import { Provider } from "aws-cdk-lib/custom-resources";

export interface WebSearchApiKeyProviderProps {
  projectPathPrefix: string;
  apiKeyValue: string; // Set to "DUMMY" initially, users update via console
  onEventHandler: IFunction;
}

export class WebSearchApiKeyProvider extends Construct {
  public readonly providerArn: string;
  public readonly secretArn: string;

  constructor(
    scope: Construct,
    id: string,
    props: WebSearchApiKeyProviderProps,
  ) {
    super(scope, id);

    const { projectPathPrefix, apiKeyValue, onEventHandler } = props;

    // Grant permissions
    onEventHandler.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "bedrock-agentcore:CreateApiKeyCredentialProvider",
          "bedrock-agentcore:GetApiKeyCredentialProvider",
          "bedrock-agentcore:DeleteApiKeyCredentialProvider",
          "bedrock-agentcore:CreateTokenVault",
          "bedrock-agentcore:GetTokenVault",
          "secretsmanager:CreateSecret",
          "secretsmanager:PutSecretValue",
          "secretsmanager:DescribeSecret",
          "secretsmanager:TagResource",
          "secretsmanager:DeleteSecret",
        ],
        resources: ["*"],
      }),
    );

    // Amplify 管理の Lambda を custom resource provider に利用する
    const provider = new Provider(this, "Provider", {
      onEventHandler,
    });

    // Custom Resource
    const resource = new CustomResource(this, "Resource", {
      serviceToken: provider.serviceToken,
      properties: {
        providerName: `google-custom-search-${projectPathPrefix}`,
        apiKeyValue: apiKeyValue,
      },
    });

    this.providerArn = resource.getAttString("providerArn");
    this.secretArn = resource.getAttString("secretArn");
  }
}
