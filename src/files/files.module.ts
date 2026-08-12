import { Module } from '@nestjs/common';
import { DynamoDBModule } from '../dynamodb/dynamodb.module';
import { S3Module } from '../s3/s3.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

@Module({
  imports: [S3Module, DynamoDBModule],
  controllers: [FilesController],
  providers: [FilesService]
})
export class FilesModule {}
