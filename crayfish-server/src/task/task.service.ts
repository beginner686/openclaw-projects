import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Task } from '@prisma/client';

@Injectable()
export class TaskService {
    constructor(private prisma: PrismaService) { }

    async create(data: Prisma.TaskCreateInput): Promise<Task> {
        return this.prisma.task.create({
            data,
        });
    }

    async findAll(where: Prisma.TaskWhereInput): Promise<Task[]> {
        return this.prisma.task.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        username: true,
                        nickname: true,
                    },
                },
            },
        });
    }

    async findOne(id: string): Promise<Task | null> {
        return this.prisma.task.findUnique({
            where: { id },
            include: { logs: true },
        });
    }

    async updateStatus(id: string, status: string, error?: string) {
        const data: any = { status };
        if (status === 'running') data.startedAt = new Date();
        if (status === 'success' || status === 'failed') data.finishedAt = new Date();
        if (error) data.errorMessage = error;

        return this.prisma.task.update({
            where: { id },
            data,
        });
    }

    async addLog(taskId: string, content: string, level: string = 'info') {
        return this.prisma.taskLog.create({
            data: {
                taskId,
                content,
                level,
            },
        });
    }
}
