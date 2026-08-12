import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DynamoDBService } from '../dynamodb/dynamodb.service';
import { S3Service } from '../s3/s3.service';
import { FileUploadedFile } from './files.interface';

@Injectable()
export class FilesService {
    constructor(
        private readonly s3Service: S3Service,
        private readonly dynamoDBService: DynamoDBService
    ) { }

    // Endpoint to upload a file
    async uploadFile(userId: string, file: FileUploadedFile) {

        if (!userId) {
            throw new NotFoundException('User not found');
        }

        if (!file) {
            throw new NotFoundException('File is required');
        }
        const fileId = randomUUID();

        const safeFileName =
            file.originalname.replace(
                /[^a-zA-Z0-9._-]/g,
                '_',
            );

        const s3Key =
            `uploads/${userId}/${fileId}-${safeFileName}`
        const result = await this.s3Service.uploadFile(
            s3Key,
            file.buffer,
            file.mimetype,
        );

        const item = {
            PK: `USER#${userId}`,
            SK: `FILE#${fileId}`,

            entityType: 'FILE',
            fileId,
            userId,

            fileName: file.originalname,
            contentType: file.mimetype,
            size: file.size,
            s3Key: result.key,
            uploadedAt: new Date().toISOString(),
        }
        await this.dynamoDBService.putItem(item);

        return {
            fileId,
            fileName: file.originalname,
            contentType: file.mimetype,
            size: file.size,
            s3Key: result.key,
        };
    }

    // Endpoint to upload multiple files
    async uploadMultipleFiles(
        userId: string,
        files: FileUploadedFile[],
    ) {
        const results: any = [];

        for (const file of files) {
            const result =
                await this.uploadFile(
                    userId,
                    file,
                );

            results.push(result);
        }

        return {
            count: results.length,
            files: results,
        };
    }


    // Endpoint to get user files
    async getUserFiles(userId: string, limit = 20,
        cursor?: string,) {

        let lastKey;

        if (cursor) {
            lastKey = JSON.parse(
                Buffer.from(cursor, 'base64').toString(
                    'utf8',
                ),
            );
        }
        const results = await this.dynamoDBService.getUserFiles(
            userId
            , limit, lastKey);


        const files = await Promise.all(
            results?.items?.map(async (item) => {
                const url =
                    await this.s3Service.getPresignedDownloadUrl(
                        item.s3Key,

                    );

                return {
                    fileId: item.SK.replace('FILE#', ''),
                    fileName: item.fileName,
                    mimeType: item.contentType,
                    size: item.size,
                    createdAt: item.uploadedAt,

                    previewUrl: url,
                };
            }),
        );
        let nextCursor: string | null = null;

        if (results.lastKey) {
            nextCursor = Buffer.from(
                JSON.stringify(
                    results.lastKey,
                ),
            ).toString('base64');
        }

        return {
            items: files,
            nextCursor,
        };
    }

    // Endpoint to get a specific file's metadata
    async getFileMetadata(
        userId: string,
        fileId: string,
    ) {
        const pk = `USER#${userId}`;
        const sk = `FILE#${fileId}`;
        const item =
            await this.dynamoDBService.getItem(pk, sk);

        if (!item) {
            throw new NotFoundException(
                'File not found',
            );
        }

        const previewUrl =
            await this.s3Service.getPresignedDownloadUrl(
                item.s3Key,
            );

        return {
            ...item,
            fileId: item.SK.replace('FILE#', ''),
            previewUrl,
        };
    }

    // Endpoint to download a file
    async getDownloadUrl(userId: string, fileId: string) {
        const item = await this.dynamoDBService.getItem(
            `USER#${userId}`,
            `FILE#${fileId}`,
        );

        if (!item) {
            throw new NotFoundException('File not found');
        }

        const url = await this.s3Service.getPresignedDownloadUrl(
            String(item.s3Key),
        );

        return {
            fileName: item.fileName,
            fileId: item.SK.replace('FILE#', ''),
            url,
        };
    }

    // Endpoint to delete a file
    async deleteFile(userId: string, fileId: string) {
        const pk = `USER#${userId}`;
        const sk = `FILE#${fileId}`;

        // 1. Find metadata
        const item = await this.dynamoDBService.getItem(pk, sk);

        if (!item) {
            throw new NotFoundException('File not found');
        }

        // 2. Delete actual file from S3
        await this.s3Service.deleteFile(String(item.s3Key));

        // 3. Delete metadata from DynamoDB
        await this.dynamoDBService.deleteItem(pk, sk);

        return {
            message: 'File deleted successfully',
            fileId,
        };
    }
}