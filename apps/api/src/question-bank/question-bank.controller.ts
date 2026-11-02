import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/auth.decorators';
import type { AuthUser } from '../common/types/auth-user';
import { QuestionBankService } from './question-bank.service';
import {
  CreateQuestionDto,
  QuestionQueryDto,
  UpdateQuestionDto,
} from './dto/question.dto';

@ApiTags('Question Bank')
@ApiBearerAuth()
@Roles('INSTRUCTOR', 'ADMIN')
@Controller('questions')
export class QuestionBankController {
  constructor(private readonly questionBankService: QuestionBankService) {}

  @Get()
  @ApiOperation({ summary: 'List and filter questions in your question bank' })
  list(@Query() query: QuestionQueryDto, @CurrentUser() user: AuthUser) {
    return this.questionBankService.list(query, user);
  }

  @Get('topics')
  @ApiOperation({ summary: 'List question topics with counts' })
  topics(@Query('courseId') courseId: string | undefined, @CurrentUser() user: AuthUser) {
    return this.questionBankService.topics(courseId, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a question including its correct answer (instructor only)' })
  getById(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.questionBankService.getById(id, user);
  }

  @Get(':id/preview')
  @ApiOperation({ summary: 'Preview a question exactly as an instructor' })
  preview(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.questionBankService.getById(id, user);
  }

  @Post()
  @ApiOperation({ summary: 'Create an MCQ question with exactly one correct option' })
  create(@Body() dto: CreateQuestionDto, @CurrentUser() user: AuthUser) {
    return this.questionBankService.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a question and replace its options' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.questionBankService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Safely delete an unused question' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.questionBankService.remove(id, user);
  }
}
