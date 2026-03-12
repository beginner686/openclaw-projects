import { Module } from '@nestjs/common';
import { ModuleManageService } from './module-manage.service';
import { ModuleManageController } from './module-manage.controller';

@Module({
  providers: [ModuleManageService],
  controllers: [ModuleManageController]
})
export class ModuleManageModule {}
