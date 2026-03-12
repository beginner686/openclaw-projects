import { Controller, Get, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ReportService } from './report.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportController {
    constructor(private readonly reportService: ReportService) { }

    @Get()
    async findAll(@Request() req, @Query('moduleCode') moduleCode?: string) {
        return this.reportService.findAll(req.user.tenantId, moduleCode);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.reportService.findOne(id);
    }
}
