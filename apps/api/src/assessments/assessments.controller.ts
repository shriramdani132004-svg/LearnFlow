import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/auth.decorators';
import type { AuthUser } from '../common/types/auth-user';
import { AssessmentsService } from './assessments.service';
import { AssessmentReportsService } from './assessment-reports.service';
import {
  AssessmentQueryDto,
  AttemptListQueryDto,
  CreateAssessmentDto,
  UpdateAssessmentDto,
} from './dto/assessment.dto';

@ApiTags('Assessments')
@ApiBearerAuth()
@Controller('assessments')
export class AssessmentsController {
  constructor(
    private readonly assessmentsService: AssessmentsService,
    private readonly reportsService: AssessmentReportsService,
  ) {}

  @Roles('INSTRUCTOR', 'ADMIN')
  @Get()
  @ApiOperation({ summary: 'List assessments authored by the current instructor' })
  list(@Query() query: AssessmentQueryDto, @CurrentUser() user: AuthUser) {
    return this.assessmentsService.list(query, user);
  }

  @Roles('STUDENT', 'ADMIN')
  @Get('available')
  @ApiOperation({ summary: 'List assessments available to the current student' })
  available(@CurrentUser() user: AuthUser) {
    return this.assessmentsService.available(user);
  }

  @Roles('INSTRUCTOR', 'ADMIN')
  @Post()
  @ApiOperation({ summary: 'Create a draft assessment from a question pool' })
  create(@Body() dto: CreateAssessmentDto, @CurrentUser() user: AuthUser) {
    return this.assessmentsService.create(dto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an assessment (instructor view or enrolled student view)' })
  getById(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.assessmentsService.getById(id, user);
  }

  @Roles('INSTRUCTOR', 'ADMIN')
  @Patch(':id')
  @ApiOperation({ summary: 'Update an assessment that has no attempts in progress' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAssessmentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assessmentsService.update(id, dto, user);
  }

  @Roles('INSTRUCTOR', 'ADMIN')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete an assessment without attempt history' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.assessmentsService.remove(id, user);
  }

  @Roles('INSTRUCTOR', 'ADMIN')
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish an assessment' })
  publish(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.assessmentsService.publish(id, user);
  }

  @Roles('INSTRUCTOR', 'ADMIN')
  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Move an assessment back to draft' })
  unpublish(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.assessmentsService.unpublish(id, user);
  }

  @Roles('INSTRUCTOR', 'ADMIN')
  @Post(':id/release-results')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release results when immediate visibility is disabled' })
  release(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.assessmentsService.releaseResults(id, user);
  }

  @Roles('INSTRUCTOR', 'ADMIN')
  @Get(':id/preview')
  @ApiOperation({ summary: 'Preview every question and answer in an assessment' })
  preview(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.assessmentsService.preview(id, user);
  }

  @Roles('INSTRUCTOR', 'ADMIN')
  @Get(':id/report')
  @ApiOperation({ summary: 'Assessment analytics: scores, pass rate and question accuracy' })
  report(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.reportsService.report(id, user);
  }

  @Roles('INSTRUCTOR', 'ADMIN')
  @Get(':id/attempts')
  @ApiOperation({ summary: 'Paginated list of student attempts for an assessment' })
  attempts(
    @Param('id') id: string,
    @Query() query: AttemptListQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.reportsService.listAttempts(id, query, user);
  }

  @Roles('INSTRUCTOR', 'ADMIN')
  @Get(':id/report.csv')
  @ApiProduces('text/csv')
  @ApiOperation({ summary: 'Export assessment results as CSV' })
  async csv(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Res() response: Response,
  ) {
    const csv = await this.reportsService.attemptsCsv(id, user);
    const safeName = id.replace(/[^a-zA-Z0-9_-]/g, '');
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="learnflow-assessment-${safeName}.csv"`,
    );
    response.send(csv);
  }
}
