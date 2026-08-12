import { Module } from '@nestjs/common';
import { DynamoDBModule } from '../dynamodb/dynamodb.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [DynamoDBModule],
  controllers: [UsersController],
  providers: [UsersService]
})
export class UsersModule {}
