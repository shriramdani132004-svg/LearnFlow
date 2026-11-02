import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/auth.decorators';
import type { AuthUser } from '../common/types/auth-user';
import { EnrollmentsService } from './enrollments.service';
import { EnrollmentQueryDto } from './dto/enrollment.dto';

@ApiTags('Enrollments')
@ApiBearerAuth()
@Controller()
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Roles('STUDENT', 'ADMIN')
  @Post('courses/:id/enroll')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Enroll the current student in a published course' })
  enroll(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.enrollmentsService.enroll(id, user);
  }

  @Roles('STUDENT', 'ADMIN')
  @Delete('courses/:id/enroll')
  @ApiOperation({ summary: 'Cancel the current student enrollment' })
  unenroll(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.enrollmentsService.unenroll(id, user);
  }

  @Get('enrollments/me')
  @ApiOperation({ summary: 'List the current user enrollments and lesson progress' })
  mine(@CurrentUser() user: AuthUser) {
    return this.enrollmentsService.mine(user);
  }

  @Roles('INSTRUCTOR', 'ADMIN')
  @Get('courses/:id/enrollments')
  @ApiOperation({ summary: 'List student enrollments for a course you own' })
  roster(
    @Param('id') id: string,
    @Query() query: EnrollmentQueryDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.enrollmentsService.roster(id, query, user);
  }
}
