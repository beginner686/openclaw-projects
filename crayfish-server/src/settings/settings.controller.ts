import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    @Get()
    async getSettings(@Request() req) {
        return this.settingsService.getSettings(req.user.tenantId);
    }

    @Put()
    async updateSetting(@Request() req, @Body() body: { key: string; value: string }) {
        // Basic implementation: only allow updating tenant specific settings or check roles for global
        return this.settingsService.updateSetting(body.key, body.value, req.user.tenantId);
    }
}
