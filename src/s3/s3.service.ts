import {
    DeleteObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3Service {
    private readonly client: S3Client;
    private readonly bucketName: string;

    constructor(private readonly configService: ConfigService) {
        this.client = new S3Client({
            region: this.configService.get<string>('AWS_REGION'),
        });

        this.bucketName =
            this.configService.get<string>('AWS_S3_BUCKET')!;
    }

    async uploadFile(
        key: string,
        file: Buffer,
        contentType: string,
    ) {
        await this.client.send(
            new PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: file,
                ContentType: contentType,
            }),
        );

        return {
            bucket: this.bucketName,
            key,
        };
    }

    async getFile(key: string) {
        return this.client.send(
            new GetObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            }),
        );
    }

    async deleteFile(key: string) {
        await this.client.send(
            new DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            }),
        );
    }

    async getPresignedDownloadUrl(key: string) {
        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: key,
        });

        return getSignedUrl(this.client, command, {
            expiresIn: 3600, // 1 hour
        });
    }

}