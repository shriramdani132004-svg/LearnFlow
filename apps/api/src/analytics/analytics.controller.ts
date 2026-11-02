import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/auth.decorators';
import type { AuthUser } from '../common/types/auth-user';
import { AnalyticsService } from './analytics.service';
import { AssessmentReportsService } from '../assessments/assessment-reports.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly reportsService: AssessmentReportsService,
  ) {}

  @Roles('STUDENT', 'ADMIN')
  @Get('student')
  @ApiOperation({ summary: 'Student learning and assessment analytics from live data' })
  student(@CurrentUser() user: AuthUser) {
    return this.analyticsService.student(user);
  }

  @Roles('INSTRUCTOR', 'ADMIN')
  @Get('instructor')
  @ApiOperation({ summary: 'Instructor teaching, enrollment and assessment analytics' })
  instructor(@CurrentUser() user: AuthUser) {
    return this.analyticsService.instructor(user);
  }

  @Roles('INSTRUCTOR', 'ADMIN')
  @Get('courses/:id')
  @ApiOperation({ summary: 'Course enrollment, lesson and assessment analytics' })
  course(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.analyticsService.course(id, user);
  }

  @Roles('INSTRUCTOR', 'ADMIN')
  @Get('assessments/:id')
  @ApiOperation({ summary: 'Assessment score, pass rate and question accuracy analytics' })
  assessment(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.reportsService.report(id, user);
  }
}
