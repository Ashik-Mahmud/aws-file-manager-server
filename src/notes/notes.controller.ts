import { Controller, Get } from '@nestjs/common';

@Controller('notes')
export class NotesController {

    @Get()
    getNotes(): { message: string, status: number } {

        return {
            message: 'This is the notes endpoint',
            status: 200
        }
    }
}
