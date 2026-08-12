import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DynamoDBModule } from './dynamodb/dynamodb.module';
import { FilesModule } from './files/files.module';
import { NotesModule } from './notes/notes.module';
import { S3Module } from './s3/s3.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    AuthModule,
    NotesModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DynamoDBModule,
    S3Module,
    UsersModule,
    FilesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
