import { Module } from '@nestjs/common';
import { AttemptsController } from './attempts.controller';
import { AttemptsService } from './attempts.service';
import { AttemptExpiryService } from './attempt-expiry.service';

@Module({
  controllers: [AttemptsController],
  providers: [AttemptsService, AttemptExpiryService],
  exports: [AttemptsService],
})
export class AttemptsModule {}
