import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    // 1. 创建默认租户
    const tenant = await prisma.tenant.upsert({
        where: { id: 'default-tenant-id' },
        update: {},
        create: {
            id: 'default-tenant-id',
            name: '小龙虾演示租户',
            status: 1,
        },
    });

    // 2. 创建默认管理员
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            password: hashedPassword,
            nickname: '系统管理员',
            tenantId: tenant.id,
            status: 1,
        },
    });

    // 3. 预留 15 个模块
    const modules = [
        { code: 'marketing', name: '企业营销自动化', path: '/modules/marketing' },
        { code: 'ad-monitor', name: '广告监测与复盘', path: '/modules/ad-monitor' },
        { code: 'content', name: '内容生成中心', path: '/modules/content' },
        { code: 'leads', name: '线索清洗与 CRM', path: '/modules/leads' },
        { code: 'public-opinion', name: '舆情监控', path: '/modules/public-opinion' },
        { code: 'private-domain', name: '私域运营', path: '/modules/private-domain' },
        { code: 'live-control', name: '直播场控', path: '/modules/live-control' },
        { code: 'product-check', name: '商品体检', path: '/modules/product-check' },
        { code: 'invoice', name: '发票管理', path: '/modules/invoice' },
        { code: 'matchmaking', name: '相亲匹配', path: '/modules/matchmaking' },
        { code: 'job-leads', name: '求职线索', path: '/modules/job-leads' },
        { code: 'anti-fraud', name: '反诈识别', path: '/modules/anti-fraud' },
        { code: 'campaign', name: '活动执行', path: '/modules/campaign' },
        { code: 'analytics', name: '数据分析中心', path: '/modules/analytics' },
        { code: 'ai-assistant', name: '通用 AI 助手', path: '/modules/ai-assistant' },
    ];

    for (const m of modules) {
        const createdModule = await prisma.module.upsert({
            where: { moduleCode: m.code },
            update: {
                moduleName: m.name,
                routePath: m.path,
            },
            create: {
                moduleCode: m.code,
                moduleName: m.name,
                routePath: m.path,
                status: 2, // 开发中
            },
        });

        // 为默认租户开通所有模块
        await prisma.tenantModule.upsert({
            where: {
                tenantId_moduleId: {
                    tenantId: tenant.id,
                    moduleId: createdModule.id,
                },
            },
            update: {},
            create: {
                tenantId: tenant.id,
                moduleId: createdModule.id,
            },
        });
    }

    console.log('Seed completed successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
