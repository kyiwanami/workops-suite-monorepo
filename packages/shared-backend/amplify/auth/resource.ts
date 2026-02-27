import { referenceAuth } from "@aws-amplify/backend";
import type { ParameterStoreConfig } from "../ssm/resource";

/**
 * Parameter Storeの設定からauth resourceを作成
 * CDKで作成済みのCognitoを参照し、Gen2側で再作成しない
 */
export const createAuthResource = (params: ParameterStoreConfig) => {
  return referenceAuth({
    userPoolId: params.USER_POOL_ID,
    identityPoolId: params.IDENTITY_POOL_ID,
    authRoleArn: params.AUTH_ROLE_ARN,
    unauthRoleArn: params.UNAUTH_ROLE_ARN,
    userPoolClientId: params.USER_POOL_CLIENT_ID,
  });
};
