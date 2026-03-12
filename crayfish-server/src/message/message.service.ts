import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessageService {
    constructor(private prisma: PrismaService) { }

    async findAll(tenantId: string) {
        return this.prisma.message.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async markAsRead(id: string) {
        return this.prisma.message.update({
            where: { id },
            data: { isRead: true },
        });
    }
}
