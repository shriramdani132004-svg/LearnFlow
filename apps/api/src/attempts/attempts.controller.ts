import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/auth.decorators';
import type { AuthUser } from '../common/types/auth-user';
import { AttemptsService } from './attempts.service';
import { SaveAnswerDto } from './dto/attempt.dto';

@ApiTags('Attempts')
@ApiBearerAuth()
@Controller()
export class AttemptsController {
  constructor(private readonly attemptsService: AttemptsService) {}

  @Roles('STUDENT', 'ADMIN')
  @Post('assessments/:id/attempts')
  @ApiOperation({
    summary: 'Start an attempt, or resume the active attempt, with a server deadline',
  })
  start(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.attemptsService.start(id, user);
  }

  @Get('attempts/me/history')
  @ApiOperation({ summary: 'Assessment history for the current student' })
  history(@CurrentUser() user: AuthUser) {
    return this.attemptsService.history(user);
  }

  @Get('attempts/:id')
  @ApiOperation({ summary: 'Resume an attempt with its saved answers' })
  getById(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.attemptsService.getAttempt(id, user);
  }

  @Roles('STUDENT', 'ADMIN')
  @Put('attempts/:id/answers/:questionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Autosave an answer; rejected after the server deadline' })
  saveAnswer(
    @Param('id') id: string,
    @Param('questionId') questionId: string,
    @Body() dto: SaveAnswerDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.attemptsService.saveAnswer(id, questionId, dto, user);
  }

  @Roles('STUDENT', 'ADMIN')
  @Post('attempts/:id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit an attempt and grade it transactionally' })
  submit(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.attemptsService.submit(id, user);
  }

  @Get('attempts/:id/result')
  @ApiOperation({ summary: 'Get the released result and answer review for an attempt' })
  result(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.attemptsService.result(id, user);
  }
}
