import { IsString, MaxLength } from 'class-validator';

export class SaveAnswerDto {
  @IsString()
  @MaxLength(80)
  selectedAttemptOptionId!: string;
}
