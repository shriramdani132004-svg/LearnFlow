import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma.service';
import { AttemptsService } from './attempts.service';

@Injectable()
export class AttemptExpiryService {
  private readonly logger = new Logger(AttemptExpiryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly attemptsService: AttemptsService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async finalizeExpiredAttempts(): Promise<void> {
    const expired = await this.prisma.assessmentAttempt.findMany({
      where: {
        status: 'IN_PROGRESS',
        expiresAt: { lte: new Date() },
      },
      select: { id: true },
      take: 100,
      orderBy: { expiresAt: 'asc' },
    });

    if (expired.length === 0) return;

    for (const attempt of expired) {
      try {
        await this.attemptsService.finalizeExpiredAttempt(attempt.id);
      } catch (error) {
        this.logger.error(
          `Failed to finalize expired attempt ${attempt.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
    this.logger.log(`Finalized ${expired.length} expired attempt(s)`);
  }
}
