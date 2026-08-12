import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DeleteCommand,
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    QueryCommand
} from '@aws-sdk/lib-dynamodb';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DynamoDBService {
    private readonly client: DynamoDBDocumentClient;
    private readonly tableName: string;

    constructor(private readonly configService: ConfigService) {
        const dynamoDBClient = new DynamoDBClient({
            region: this.configService.get<string>('AWS_REGION'),
        });

        this.client = DynamoDBDocumentClient.from(dynamoDBClient);

        this.tableName =
            this.configService.get<string>('AWS_DYNAMODB_TABLE')!;
    }

    async putItem(item: Record<string, unknown>) {
        await this.client.send(
            new PutCommand({
                TableName: this.tableName,
                Item: item,
            }),
        );
    }

    async getItem(pk: string, sk: string) {
        const result = await this.client.send(
            new GetCommand({
                TableName: this.tableName,
                Key: {
                    PK: pk,
                    SK: sk,
                },
            }),
        );

        return result.Item;
    }

    async deleteItem(pk: string, sk: string) {
        await this.client.send(
            new DeleteCommand({
                TableName: this.tableName,
                Key: {
                    PK: pk,
                    SK: sk,
                },
            }),
        );
    }

    async queryByPartitionKey(pk: string) {
        const result = await this.client.send(
            new QueryCommand({
                TableName: this.tableName,
                KeyConditionExpression:
                    'PK = :pk AND begins_with(SK, :skPrefix)',
                ExpressionAttributeValues: {
                    ':pk': pk,
                    ':skPrefix': 'FILE#',
                },
            }),
        );

        return result.Items ?? [];
    }

    async getUserByEmail(email: string) {
        const result = await this.client.send(
            new QueryCommand({
                TableName: this.tableName,

                IndexName: 'GSI1',

                KeyConditionExpression: 'GSI1PK = :email',

                ExpressionAttributeValues: {
                    ':email': `EMAIL#${email.toLowerCase()}`,
                },

                Limit: 1,
            }),
        );

        return result.Items?.[0] ?? null;
    }

    async getUserFiles(userId: string, limit = 20, lastKey?: Record<string, any>) {
        const result = await this.client.send(
            new QueryCommand({
                TableName: this.tableName,

                KeyConditionExpression:
                    'PK = :pk AND begins_with(SK, :sk)',

                ExpressionAttributeValues: {
                    ':pk': `USER#${userId}`,
                    ':sk': 'FILE#',
                },
                Limit: limit,
                ExclusiveStartKey: lastKey,
            }),
        );

        return {
            items: result.Items ?? [],
            lastKey: result.LastEvaluatedKey,
        };
    }
}