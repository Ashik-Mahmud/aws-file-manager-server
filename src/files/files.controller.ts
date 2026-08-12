import {
    BadRequestException,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Query,
    Request,
    UploadedFile,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiOperation,
    ApiResponse,
    ApiTags
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from './constants/file.constants';
import { GetFilesDto } from './dto/files.dto';
import { FilesService } from './files.service';

@ApiTags('Files')
@Controller('files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class FilesController {
    constructor(private readonly filesService: FilesService) { }

    @Post('upload')
    @ApiOperation({
        summary: 'Upload a file',
        description: 'Uploads a file to Amazon S3 and stores its metadata in DynamoDB.',
    })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
            required: ['file'],
        },
    })
    @ApiResponse({
        status: 201,
        description: 'File uploaded successfully.',
    })
    @UseInterceptors(FileInterceptor('file', {
        limits: {
            fileSize: MAX_FILE_SIZE,
        },
        fileFilter: (req, file, cb) => {
            if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
                return cb(new BadRequestException('File type is not allowed',), false);
            }
            cb(null, true);
        },
    }))
    async uploadFile(
        @Request() req,
        @UploadedFile() file: any,
    ) {
        return this.filesService.uploadFile(req?.user?.userId, file);
    }

    // Endpoint to upload multiple files
    @Post('upload-multiple')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(
        FilesInterceptor('files', 10, {
            limits: {
                fileSize: MAX_FILE_SIZE,
            },

            fileFilter: (req, file, callback) => {
                if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
                    return callback(
                        new BadRequestException(
                            'File type is not allowed',
                        ),
                        false,
                    );
                }

                callback(null, true);
            },
        }),
    )
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                files: {
                    type: 'array',
                    items: {
                        type: 'string',
                        format: 'binary',
                    },
                },
            },
        },
    })
    async uploadMultiple(
        @Request() req,
        @UploadedFiles()
        files: any[],
    ) {
        if (!files?.length) {
            throw new BadRequestException(
                'At least one file is required',
            );
        }

        return this.filesService.uploadMultipleFiles(
            req.user.userId,
            files,
        );
    }

    // Endpoint to get user files
    @ApiOperation({
        summary: 'Get user files',
        description: 'Returns all files belonging to the authenticated user.',
    })
    @ApiResponse({
        status: 200,
        description: 'List of user files.',
    })
    @Get()
    async getUserFiles(
        @Request() req,
        @Query() query: GetFilesDto,
    ) {
        const parsedLimit = Math.min(
            Number(query?.limit) || 20,
            100,
        );
        return this.filesService.getUserFiles(req?.user?.userId, parsedLimit, query?.cursor);
    }

    // Endpoint to get a specific file's metadata
    @ApiOperation({
        summary: 'Get file metadata',
        description: 'Returns metadata for a specific file belonging to the authenticated user.',
    })
    @ApiResponse({
        status: 200,
        description: 'File metadata.',
    })
    @Get(':fileId')
    async getFileMetadata(
        @Request() req,
        @Param('fileId') fileId: string,
    ) {
        return this.filesService.getFileMetadata(
            req?.user?.userId,
            fileId,
        );
    }

    // Endpoint to download a file
    @ApiOperation({
        summary: 'Download a file',
        description: 'Generates a presigned URL for downloading a file from Amazon S3.',
    })
    @ApiResponse({
        status: 200,
        description: 'Presigned URL for downloading the file.',
    })

    @Get(':fileId/download')
    async downloadFile(
        @Request() req,
        @Param('fileId') fileId: string,
    ) {
        return this.filesService.getDownloadUrl(
            req?.user?.userId,
            fileId,
        );
    }

    // Endpoint to delete a file
    @ApiOperation({
        summary: 'Delete a file',
        description: 'Deletes a file from Amazon S3 and removes its metadata from DynamoDB.',
    })
    @ApiResponse({
        status: 200,
        description: 'File deleted successfully.',
    })
    @Delete(':fileId')
    async deleteFile(
        @Request() req,
        @Param('fileId') fileId: string,
    ) {
        return this.filesService.deleteFile(
            req?.user?.userId,
            fileId,
        );
    }
}