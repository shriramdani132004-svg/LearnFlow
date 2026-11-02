import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { DIFFICULTIES } from '../../question-bank/dto/question.dto';

export class CreateAssessmentDto {
  @IsString()
  @MinLength(5)
  courseId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  instructions?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(600)
  durationMinutes!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  totalQuestions!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  passPercentage!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  maxAttempts!: number;

  @IsOptional()
  @IsDateString()
  availableFrom?: string;

  @IsOptional()
  @IsDateString()
  availableUntil?: string;

  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;

  @IsOptional()
  @IsBoolean()
  shuffleOptions?: boolean;

  @IsOptional()
  @IsBoolean()
  showResultsImmediately?: boolean;

  @IsOptional()
  @IsBoolean()
  allowAnswerReview?: boolean;

  @IsOptional()
  @IsIn(DIFFICULTIES)
  difficultyFilter?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  topicFilter?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  questionIds!: string[];
}

export class UpdateAssessmentDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  instructions?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(600)
  durationMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  totalQuestions?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  passPercentage?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  maxAttempts?: number;

  @IsOptional()
  @IsDateString()
  availableFrom?: string | null;

  @IsOptional()
  @IsDateString()
  availableUntil?: string | null;

  @IsOptional()
  @IsBoolean()
  shuffleQuestions?: boolean;

  @IsOptional()
  @IsBoolean()
  shuffleOptions?: boolean;

  @IsOptional()
  @IsBoolean()
  showResultsImmediately?: boolean;

  @IsOptional()
  @IsBoolean()
  allowAnswerReview?: boolean;

  @IsOptional()
  @IsIn(DIFFICULTIES)
  difficultyFilter?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  topicFilter?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  questionIds?: string[];
}

export class AssessmentQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED'])
  status?: string;
}

export class AttemptListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsIn(['IN_PROGRESS', 'SUBMITTED', 'TIMED_OUT', 'GRADED'])
  status?: string;

  @IsOptional()
  @IsIn(['passed', 'failed'])
  result?: string;
}
