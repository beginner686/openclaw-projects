import { Controller, Get, Post, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { TaskService } from './task.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TaskController {
    constructor(private readonly taskService: TaskService) { }

    @Post()
    async create(@Request() req, @Body() createTaskDto: any) {
        return this.taskService.create({
            ...createTaskDto,
            tenant: { connect: { id: req.user.tenantId } },
            user: { connect: { id: req.user.userId } },
            status: 'pending',
        });
    }

    @Get()
    async findAll(@Request() req, @Query('moduleCode') moduleCode?: string) {
        const where: any = { tenantId: req.user.tenantId };
        if (moduleCode) {
            where.moduleCode = moduleCode;
        }
        return this.taskService.findAll(where);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.taskService.findOne(id);
    }
}
