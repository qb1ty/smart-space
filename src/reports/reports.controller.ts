import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { AdminGuard, AuthGuard } from 'src/common/guard';
import { ReportsService } from './reports.service';
import { GetReportQueryDto } from './dto/get-report-query.dto';

@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("dashboard")
  @UseGuards(AuthGuard, AdminGuard)
  async getDashboard(@Query() dto: GetReportQueryDto) {
    return this.reportsService.getDashboardStats(dto)
  }

  @Get("workspaces")
  @UseGuards(AuthGuard, AdminGuard)
  async getWorkspaces(@Query() dto: GetReportQueryDto) {
    return this.reportsService.getWorkspacesEfficiency(dto)
  }

  @Get("users-activity")
  @UseGuards(AuthGuard, AdminGuard)
  async getUsersActivity(@Query() dto: GetReportQueryDto) {
    return this.reportsService.getUsersActivity(dto)
  }
}
