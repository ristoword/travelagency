import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Request, Response } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const configService = app.get(ConfigService);
  const port = parseInt(process.env.PORT || '') || configService.get<number>('app.port') || 3000;
  const nodeEnv = configService.get<string>('app.nodeEnv');
  const frontendUrl = configService.get<string>('app.frontendUrl');
  const appUrl = configService.get<string>('app.url') || `http://localhost:${port}`;

  // Security
  app.use(
    helmet({
      contentSecurityPolicy: false, // allow Swagger UI
    }),
  );
  app.use(compression());

  // CORS — allow all origins in development, specific in production
  app.enableCors({
    origin: nodeEnv === 'production'
      ? [frontendUrl || '*', 'http://localhost:3001', 'http://localhost:5173']
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Slug'],
  });

  // API Versioning
  app.enableVersioning({ type: VersioningType.URI });

  // Global prefix — exclude root paths that don't need /api
  app.setGlobalPrefix('api', { exclude: ['health', '/'] });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global filters & interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger — sempre abilitato (utile in produzione per testare l'API)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Travel Agency Management System — API')
    .setDescription(
      `**Gestionale enterprise per agenzie di viaggio**\n\n` +
      `Fasi implementate: Foundation · CRM · Sales · Cases · Bookings · Accounting · Documents · Suppliers · Communications\n\n` +
      `**Autenticazione:** Bearer JWT — usa /api/v1/auth/login per ottenere il token\n\n` +
      `**Tenant header:** X-Tenant-Slug: demo-agenzia`,
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'refresh-token')
    .addTag('Auth', 'Login, logout, refresh token, profilo')
    .addTag('Tenants', 'Gestione tenant (super admin)')
    .addTag('Users', 'Gestione utenti')
    .addTag('Roles', 'Ruoli e permessi')
    .addTag('Permissions', 'Lista permessi sistema')
    .addTag('Audit Log', 'Log completo azioni')
    .addTag('Settings', 'Impostazioni tenant')
    .addTag('CRM — Clients', 'Anagrafica clienti')
    .addTag('CRM — Leads', 'Pipeline lead e conversione')
    .addTag('CRM — Contacts', 'Contatti cliente')
    .addTag('CRM — Tags', 'Tag clienti e lead')
    .addTag('CRM — Customer Preferences', 'Preferenze di viaggio')
    .addTag('CRM — History', 'Timeline eventi cliente/lead')
    .addTag('Sales — Opportunities', 'Pipeline vendite')
    .addTag('Sales — Quotations', 'Preventivi con calcolo margini')
    .addTag('Sales — Proposals', 'Proposte commerciali')
    .addTag('Sales — Pricing & Margins', 'Calcolo prezzi e margini')
    .addTag('Travel Cases — Cases', 'Pratiche viaggio')
    .addTag('Travel Cases — Passengers', 'Passeggeri')
    .addTag('Travel Cases — Itinerary', 'Programma giornaliero')
    .addTag('Travel Cases — Services', 'Servizi prenotati')
    .addTag('Travel Cases — Checklists', 'Checklist pratica')
    .addTag('Bookings', 'Prenotazioni (volo, hotel, transfer...)')
    .addTag('Bookings — Documents', 'Voucher e biglietti')
    .addTag('Accounting — Invoices', 'Fatture')
    .addTag('Accounting — Payments', 'Pagamenti e cash flow')
    .addTag('Accounting — Credit Notes', 'Note di credito')
    .addTag('Documents — Client Documents', 'Passaporti e documenti cliente')
    .addTag('Documents — Templates', 'Template PDF con variabili')
    .addTag('Suppliers', 'Anagrafica fornitori')
    .addTag('Suppliers — Contracts', 'Contratti e commissioni')
    .addTag('Communications', 'Email, WhatsApp, template comunicazioni')
    .addTag('Analytics', 'KPI dashboard, sales, margins, forecasts')
    .addTag('Workflows', 'Tasks, approvals, reminders')
    .addTag('Health', 'Healthcheck')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      tagsSorter: 'alpha',
    },
    customSiteTitle: 'Travel Agency API Docs',
  });

  // Root redirect → Swagger docs
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/', (_req: Request, res: Response) => {
    res.redirect('/api/docs');
  });

  await app.listen(port);

  const url = nodeEnv === 'production' ? appUrl : `http://localhost:${port}`;
  console.log(`\n🚀 Travel Agency API: ${url}`);
  console.log(`📚 Swagger docs:     ${url}/api/docs`);
  console.log(`💚 Health check:     ${url}/health`);
  console.log(`🌍 Environment:      ${nodeEnv}\n`);
}

bootstrap();
