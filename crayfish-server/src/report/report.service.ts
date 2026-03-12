import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportService {
    constructor(private prisma: PrismaService) { }

    async findAll(tenantId: string, moduleCode?: string) {
        return this.prisma.report.findMany({
            where: {
                tenantId,
                moduleCode: moduleCode || undefined,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        return this.prisma.report.findUnique({
            where: { id },
        });
    }
}
