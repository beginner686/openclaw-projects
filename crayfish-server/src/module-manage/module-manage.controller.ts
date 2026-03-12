import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ModuleManageService } from './module-manage.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('modules')
export class ModuleManageController {
    constructor(private readonly moduleManageService: ModuleManageService) { }

    @Get()
    async findAll() {
        return this.moduleManageService.findAll();
    }

    @UseGuards(JwtAuthGuard)
    @Get('my')
    async findMyModules(@Request() req) {
        return this.moduleManageService.getTenantModules(req.user.tenantId);
    }

    @Get(':code')
    async findOne(@Param('code') code: string) {
        return this.moduleManageService.findOne(code);
    }
}
