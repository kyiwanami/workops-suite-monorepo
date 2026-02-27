import type { CloudFormationCustomResourceEvent } from "aws-lambda";
import {
  CognitoIdentityProviderClient,
  DescribeUserPoolCommand,
  UpdateUserPoolCommand,
  type UpdateUserPoolCommandInput,
  type VerifiedAttributeType,
} from "@aws-sdk/client-cognito-identity-provider";

interface AttachPreTokenTriggerResourceProperties {
  UserPoolId: string;
  TriggerLambdaArn: string;
}

const cognitoClient = new CognitoIdentityProviderClient({});

const resolveAutoVerifiedAttributes = (
  currentAutoVerifiedAttributes: VerifiedAttributeType[] | undefined,
  requiredVerificationAttributes: VerifiedAttributeType[] | undefined,
): VerifiedAttributeType[] | undefined => {
  if (!requiredVerificationAttributes || requiredVerificationAttributes.length === 0) {
    return currentAutoVerifiedAttributes;
  }

  const mergedAttributes = [...(currentAutoVerifiedAttributes ?? [])];
  requiredVerificationAttributes.forEach((attr) => {
    if (!mergedAttributes.includes(attr)) {
      mergedAttributes.push(attr);
    }
  });

  return mergedAttributes;
};

/**
 * 外部Cognito User PoolにPre Token Generation V2トリガーを設定する
 * 既存のLambdaConfigを保持したまま、対象トリガーだけ更新する
 */
export const handler = async (
  event: CloudFormationCustomResourceEvent<AttachPreTokenTriggerResourceProperties>,
) => {
  const { RequestType, ResourceProperties } = event;

  if (RequestType === "Delete") {
    return { PhysicalResourceId: event.PhysicalResourceId };
  }

  const describeResult = await cognitoClient.send(
    new DescribeUserPoolCommand({
      UserPoolId: ResourceProperties.UserPoolId,
    }),
  );

  const currentPool = describeResult.UserPool;

  if (!currentPool) {
    throw new Error(`UserPool not found: ${ResourceProperties.UserPoolId}`);
  }

  const requiredVerificationAttributes =
    currentPool.UserAttributeUpdateSettings?.AttributesRequireVerificationBeforeUpdate;
  const autoVerifiedAttributes = resolveAutoVerifiedAttributes(
    currentPool.AutoVerifiedAttributes,
    requiredVerificationAttributes,
  );

  const updateInput: UpdateUserPoolCommandInput = {
    UserPoolId: ResourceProperties.UserPoolId,
    LambdaConfig: {
      CreateAuthChallenge: currentPool.LambdaConfig?.CreateAuthChallenge,
      CustomEmailSender: currentPool.LambdaConfig?.CustomEmailSender,
      CustomMessage: currentPool.LambdaConfig?.CustomMessage,
      CustomSMSSender: currentPool.LambdaConfig?.CustomSMSSender,
      DefineAuthChallenge: currentPool.LambdaConfig?.DefineAuthChallenge,
      KMSKeyID: currentPool.LambdaConfig?.KMSKeyID,
      PostAuthentication: currentPool.LambdaConfig?.PostAuthentication,
      PostConfirmation: currentPool.LambdaConfig?.PostConfirmation,
      PreAuthentication: currentPool.LambdaConfig?.PreAuthentication,
      PreSignUp: currentPool.LambdaConfig?.PreSignUp,
      PreTokenGeneration: ResourceProperties.TriggerLambdaArn,
      PreTokenGenerationConfig: {
        LambdaArn: ResourceProperties.TriggerLambdaArn,
        LambdaVersion: "V2_0",
      },
      UserMigration: currentPool.LambdaConfig?.UserMigration,
      VerifyAuthChallengeResponse: currentPool.LambdaConfig?.VerifyAuthChallengeResponse,
    },
    AutoVerifiedAttributes: autoVerifiedAttributes,
  };

  await cognitoClient.send(
    new UpdateUserPoolCommand(updateInput),
  );

  return {
    PhysicalResourceId: `${ResourceProperties.UserPoolId}-pre-token-v2`,
  };
};
