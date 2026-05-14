import { Controller, Get, Redirect } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../database/prisma.service';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Health')
@Controller()
export class HealthController {
  private readonly version: string;

  constructor(private readonly prisma: PrismaService) {
    try {
      const pkg = JSON.parse(readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8'));
      this.version = pkg.version ?? '0.1.0';
    } catch {
      this.version = '0.1.0';
    }
  }

  @Get('/')
  @Public()
  @Redirect('/api/docs', 302)
  @ApiOperation({ summary: 'Root redirect to Swagger docs' })
  root() {
    return {};
  }

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Health check' })
  async check() {
    let dbStatus = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'error';
    }

    return {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: this.version,
      services: { database: dbStatus },
    };
  }
}
