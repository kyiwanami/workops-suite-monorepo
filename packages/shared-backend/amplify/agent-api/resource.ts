import { Construct } from "constructs";
import {
  AccessLogField,
  AccessLogFormat,
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  EndpointType,
  LambdaIntegration,
  LogGroupLogDestination,
  MethodLoggingLevel,
  ResponseTransferMode,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { Duration } from "aws-cdk-lib";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import type { IFunction } from "aws-cdk-lib/aws-lambda";
import type { IUserPool } from "aws-cdk-lib/aws-cognito";

interface AgentRestApiProps {
  bff: IFunction;
  userPool: IUserPool;
}

/**
 * BrowserからAgentCore BFFへ入るRegional REST API。
 * Cognito scope検証とresponse streamingの両方をAPI Gatewayへ寄せる。
 */
export class AgentRestApi extends Construct {
  public readonly api: RestApi;

  constructor(scope: Construct, id: string, props: AgentRestApiProps) {
    super(scope, id);

    const accessLogGroup = new LogGroup(this, "AccessLogs", {
      retention: RetentionDays.THREE_MONTHS,
    });

    this.api = new RestApi(this, "Api", {
      restApiName: "workops-agent-api",
      endpointTypes: [EndpointType.REGIONAL],
      deployOptions: {
        accessLogDestination: new LogGroupLogDestination(accessLogGroup),
        // response streaming固有の時刻を、通常のrequest情報と同じaccess logへ残す。
        accessLogFormat: AccessLogFormat.custom(
          JSON.stringify({
            requestId: AccessLogField.contextRequestId(),
            ip: AccessLogField.contextIdentitySourceIp(),
            user: AccessLogField.contextIdentityUser(),
            caller: AccessLogField.contextIdentityCaller(),
            requestTime: AccessLogField.contextRequestTime(),
            httpMethod: AccessLogField.contextHttpMethod(),
            resourcePath: AccessLogField.contextResourcePath(),
            status: AccessLogField.contextStatus(),
            protocol: AccessLogField.contextProtocol(),
            responseLength: AccessLogField.contextResponseLength(),
            responseTransferMode:
              "$context.integration.responseTransferMode",
            timeToAllHeaders: "$context.integration.timeToAllHeaders",
            timeToFirstContent: "$context.integration.timeToFirstContent",
            integrationLatency: "$context.integration.latency",
          }),
        ),
        loggingLevel: MethodLoggingLevel.ERROR,
        dataTraceEnabled: false,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: ["*"],
        allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
        allowHeaders: ["Authorization", "Content-Type"],
        allowCredentials: false,
      },
    });

    const authorizer = new CognitoUserPoolsAuthorizer(this, "Authorizer", {
      cognitoUserPools: [props.userPool],
      authorizerName: "workops-agent-authorizer",
    });
    // API GatewayとBFFの境界でLambda proxyとresponse streamingを固定し、Harnessの長い実行を切断しない。
    const integration = new LambdaIntegration(props.bff, {
      proxy: true,
      responseTransferMode: ResponseTransferMode.STREAM,
      timeout: Duration.seconds(300),
    });
    const options = {
      authorizationType: AuthorizationType.COGNITO,
      authorizer,
      authorizationScopes: ["workops-agent/invoke"],
    };

    const chat = this.api.root.addResource("chat");
    const sessions = chat.addResource("sessions");
    sessions.addMethod("GET", integration, options);

    const session = sessions.addResource("{sessionId}");
    session.addMethod("DELETE", integration, options);

    const messages = session.addResource("messages");
    messages.addMethod("POST", integration, options);
    messages.addMethod("GET", integration, options);

  }
}
