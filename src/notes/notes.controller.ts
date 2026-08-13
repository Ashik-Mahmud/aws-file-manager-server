import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

ApiTags('Notes')
@Controller('notes')
export class NotesController {

    // GET /notes
    @ApiOperation({ summary: 'Get notes API status' })
    @ApiResponse({
        status: 200,
        description: 'Returns the status of the Notes API.',
    })
    @Get()
    getNotes(): { message: string, status?: number, environment: string, port: string, updatedAt: string, isAutomated: boolean, info: { description: string, version: string } } {

        return {
            message: 'Notes API is working',
            environment:  process.env.NODE_ENV ?? 'development',
            port: process.env.PORT ?? '3000',
            updatedAt: new Date().toISOString(),
            isAutomated: true,
            info: {
                description: 'This is a sample Notes API built with NestJS and DynamoDB.',
                version: '1.0.0',
            },
        };
    }
}
