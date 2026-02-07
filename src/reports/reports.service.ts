import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async createReport(data: {
    reporterId: string;
    reportedUserId: string;
    matchId?: string;
    reason: string;
  }) {
    return this.prisma.report.create({
      data,
    });
  }

  async blockUser(blockerId: string, blockedId: string) {
    return this.prisma.blockedUser.upsert({
      where: {
        blockerId_blockedId: {
          blockerId,
          blockedId,
        },
      },
      create: {
        blockerId,
        blockedId,
      },
      update: {},
    });
  }
}

