import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../database/prisma.service';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenantSlug?: string;
    }
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    // Tenant resolution order:
    // 1. X-Tenant-Slug header (API clients, mobile app)
    // 2. Subdomain (e.g. agenzia1.app.travelagency.com)
    // 3. JWT payload (set after auth)

    const slug =
      req.headers['x-tenant-slug'] as string ||
      this.extractSubdomain(req.hostname);

    if (slug) {
      try {
        const tenant = await this.prisma.tenant.findUnique({
          where: { slug, isActive: true, deletedAt: null },
          select: { id: true, slug: true },
        });

        if (tenant) {
          req.tenantId = tenant.id;
          req.tenantSlug = tenant.slug;
        }
      } catch {
        this.logger.warn(`Tenant lookup failed for slug: ${slug}`);
      }
    }

    next();
  }

  private extractSubdomain(hostname: string): string | null {
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      return parts[0];
    }
    return null;
  }
}
