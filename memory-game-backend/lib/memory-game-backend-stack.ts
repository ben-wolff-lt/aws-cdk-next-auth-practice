import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export class MemoryGameBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the DynamoDB Table
    const gameTable = new dynamodb.Table(this, 'GameTable', {
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST
    });

    // Add GSI for Leaderboard
    gameTable.addGlobalSecondaryIndex({
      indexName: 'GSI_Leaderboard',
      partitionKey: { name: 'GSI_PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI_SK', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL // Include all attributes in GSI
    });

    const saveGameResultLambda = new lambda.Function(
      this,
      'SaveGameResultLambda',
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'saveGameResult.handler', // File and exported function
        code: lambda.Code.fromAsset('lambdas'), // Path to the folder with Lambda code
        environment: {
          TABLE_NAME: gameTable.tableName
        }
      }
    );

    const getLeaderboardLambda = new lambda.Function(
      this,
      'GetLeaderboardLambda',
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'getLeaderboard.handler', // File and exported function
        code: lambda.Code.fromAsset('lambdas'),
        environment: {
          TABLE_NAME: gameTable.tableName
        }
      }
    );

    // Grant Permissions
    gameTable.grantReadWriteData(saveGameResultLambda);
    gameTable.grantReadData(getLeaderboardLambda);

    // API Gateway
    const api = new apigateway.RestApi(this, 'MemoryGameApi', {
      restApiName: 'Memory Game Service'
    });

    // Save Game Result Route
    const gameResultResource = api.root.addResource('game-result');
    gameResultResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(saveGameResultLambda)
    );

    // Get Leaderboard Route
    const leaderboardResource = api.root.addResource('leaderboard');
    leaderboardResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getLeaderboardLambda)
    );
  }
}
