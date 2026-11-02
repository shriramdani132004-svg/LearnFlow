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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public, Roles } from '../common/decorators/auth.decorators';
import type { AuthUser } from '../common/types/auth-user';
import { CoursesService } from './courses.service';
import {
  CourseQueryDto,
  CreateCourseDto,
  CreateLessonDto,
  CreateModuleDto,
  ReorderModulesDto,
  UpdateCourseDto,
  UpdateLessonDto,
  UpdateModuleDto,
} from './dto/course.dto';

@ApiTags('Courses')
@ApiBearerAuth()
@Controller()
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Public()
  @Get('courses')
  @ApiOperation({ summary: 'Browse the course catalogue or list authored courses' })
  list(@Query() query: CourseQueryDto, @CurrentUser() user?: AuthUser) {
    return this.coursesService.list(query, user);
  }

  @Public()
  @Get('courses/:id')
  @ApiOperation({ summary: 'Get a course with its modules and lessons' })
  getById(@Param('id') id: string, @CurrentUser() user?: AuthUser) {
    return this.coursesService.getById(id, user);
  }

  @Roles('INSTRUCTOR', 'ADMIN')
  @Post('courses')
  @ApiOperation({ summary: 'Create a course as a draft' })
  create(@Body() dto: CreateCourseDto, @CurrentUser() user: AuthUser) {
    return this.coursesService.create(dto, user);
  }

  @Roles('INSTRUCTOR', 'ADMIN')
  @Patch('courses/:id')
  @ApiOperation({ summary: 'Update a course you own' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.coursesService.update(id, dto, user);
  }

  @Roles('INSTRUCTOR', 'ADMIN')
  @Delete('courses/:id')
  @ApiOperation({ summary: 'Delete an unused course you own' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.coursesService.remove(id, user);
  }

  @Roles('INSTRUCTOR', 'ADMIN')
  @Post('courses/:id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a course' })
  publish(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.coursesService.publish(id, user);
  }

  @Roles('INSTRUCTOR', 'ADMIN')
  @Post('courses/:id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a course' })
  archive(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.coursesService.archive(id, user);
  }

  @Roles('INSTRUCTOR', 'ADMIN')
  @Post('courses/:id/modules')
  @ApiOperation({ summary: 'Create a module in a course you own' })
  createModule(
    @Param('id') id: string,
    @Body() dto: CreateModuleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.coursesService.createModule(id, dto, user);
  }

  @Roles('INSTRUCTOR', 'ADMIN')
  @Patch('courses/:id/modules/reorder')
  @ApiOperation({ summary: 'Reorder all modules in a course' })
  reorderModules(
    @Param('id') id: string,
    @Body() dto: ReorderModulesDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.coursesService.reorderModules(id, dto, user);
  }

  @Roles('INSTRUCTOR', 'ADMIN')
  @Patch('modules/:id')
  @ApiOperation({ summary: 'Update a module' })
  updateModule(
    @Param('id') id: string,
    @Body() dto: UpdateModuleDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.coursesService.updateModule(id, dto, user);
  }

  @Roles('INSTRUCTOR', 'ADMIN')
  @Delete('modules/:id')
  @ApiOperation({ summary: 'Delete a module' })
  removeModule(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.coursesService.removeModule(id, user);
  }

  @Roles('INSTRUCTOR', 'ADMIN')
  @Post('modules/:id/lessons')
  @ApiOperation({ summary: 'Create a lesson inside a module' })
  createLesson(
    @Param('id') id: string,
    @Body() dto: CreateLessonDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.coursesService.createLesson(id, dto, user);
  }

  @Roles('INSTRUCTOR', 'ADMIN')
  @Patch('lessons/:id')
  @ApiOperation({ summary: 'Update a lesson' })
  updateLesson(
    @Param('id') id: string,
    @Body() dto: UpdateLessonDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.coursesService.updateLesson(id, dto, user);
  }

  @Roles('INSTRUCTOR', 'ADMIN')
  @Delete('lessons/:id')
  @ApiOperation({ summary: 'Delete a lesson' })
  removeLesson(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.coursesService.removeLesson(id, user);
  }

  @Roles('STUDENT', 'ADMIN')
  @Post('lessons/:id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a lesson complete for the current student' })
  completeLesson(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.coursesService.completeLesson(id, user);
  }

  @Roles('STUDENT', 'ADMIN')
  @Delete('lessons/:id/complete')
  @ApiOperation({ summary: 'Unmark a completed lesson' })
  uncompleteLesson(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.coursesService.uncompleteLesson(id, user);
  }
}
