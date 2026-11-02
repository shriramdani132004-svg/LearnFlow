import { Module } from '@nestjs/common';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';
import { AssessmentReportsService } from './assessment-reports.service';

@Module({
  controllers: [AssessmentsController],
  providers: [AssessmentsService, AssessmentReportsService],
  exports: [AssessmentsService, AssessmentReportsService],
})
export class AssessmentsModule {}
