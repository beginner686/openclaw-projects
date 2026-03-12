import { Controller, Get, Post, Param, UseGuards, Request } from '@nestjs/common';
import { MessageService } from './message.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessageController {
    constructor(private readonly messageService: MessageService) { }

    @Get()
    async findAll(@Request() req) {
        return this.messageService.findAll(req.user.tenantId);
    }

    @Post(':id/read')
    async markAsRead(@Param('id') id: string) {
        return this.messageService.markAsRead(id);
    }
}
