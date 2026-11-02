import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;

export class QuestionOptionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  optionText!: string;

  @IsBoolean()
  isCorrect!: boolean;
}

export class CreateQuestionDto {
  @IsString()
  @MinLength(5)
  @MaxLength(80)
  courseId!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  questionText!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  explanation?: string;

  @IsIn(DIFFICULTIES)
  difficulty!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  topic!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  marks!: number;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options!: QuestionOptionDto[];
}

export class UpdateQuestionDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(80)
  courseId?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  questionText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  explanation?: string;

  @IsOptional()
  @IsIn(DIFFICULTIES)
  difficulty?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  topic?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  marks?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[];
}

export class QuestionQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsIn(DIFFICULTIES)
  difficulty?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  topic?: string;
}
