import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { TenantModule } from './tenant/tenant.module';
import { RoleModule } from './role/role.module';
import { ModuleManageModule } from './module-manage/module-manage.module';
import { TaskModule } from './task/task.module';
import { MessageModule } from './message/message.module';
import { ReportModule } from './report/report.module';
import { FileModule } from './file/file.module';
import { IntegrationModule } from './integration/integration.module';
import { SettingsModule } from './settings/settings.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UserModule,
    TenantModule,
    RoleModule,
    ModuleManageModule,
    TaskModule,
    MessageModule,
    ReportModule,
    FileModule,
    IntegrationModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
