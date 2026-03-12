import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Module } from '@prisma/client';

@Injectable()
export class ModuleManageService {
    constructor(private prisma: PrismaService) { }

    async findAll(): Promise<Module[]> {
        return this.prisma.module.findMany({
            orderBy: { sort: 'asc' },
        });
    }

    async findOne(moduleCode: string): Promise<Module | null> {
        return this.prisma.module.findUnique({
            where: { moduleCode },
        });
    }

    async getTenantModules(tenantId: string) {
        return this.prisma.tenantModule.findMany({
            where: { tenantId },
            include: { module: true },
        });
    }
}
