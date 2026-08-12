import { Injectable } from '@nestjs/common';
import { DynamoDBService } from '../dynamodb/dynamodb.service';

@Injectable()
export class UsersService {
  constructor(private readonly dynamoDBService: DynamoDBService) {}

  async getTestUser() {
    return this.dynamoDBService.getItem(
      'USER#test-001',
      'PROFILE',
    );
  }
}