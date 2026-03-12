import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
    constructor(private prisma: PrismaService) { }

    async getSettings(tenantId?: string) {
        return this.prisma.systemConfig.findMany({
            where: {
                OR: [
                    { tenantId: null },
                    { tenantId: tenantId || undefined },
                ],
            },
        });
    }

    async updateSetting(key: string, value: string, tenantId?: string) {
        return this.prisma.systemConfig.upsert({
            where: { configKey: key },
            update: { configValue: value },
            create: {
                configKey: key,
                configValue: value,
                tenantId: tenantId || null,
            },
        });
    }
}
