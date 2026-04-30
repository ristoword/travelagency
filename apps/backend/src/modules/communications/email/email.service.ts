import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as Handlebars from 'handlebars';

export interface SendEmailDto {
  to: string;
  toName?: string;
  subject: string;
  body: string;
  bodyHtml?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
    contentType?: string;
  }>;
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initTransporter();
  }

  private initTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!host || !user || !pass || pass === 'tua-app-password') {
      this.logger.warn('SMTP not configured — email sending disabled');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: parseInt(this.configService.get('SMTP_PORT') || '587'),
      secure: false,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });

    this.transporter.verify((error) => {
      if (error) {
        this.logger.warn(`SMTP connection failed: ${error.message}`);
        this.transporter = null;
      } else {
        this.logger.log('SMTP connection verified');
      }
    });
  }

  renderTemplate(template: string, data: Record<string, unknown>): string {
    const compiled = Handlebars.compile(template);
    return compiled(data);
  }

  async send(dto: SendEmailDto): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.transporter) {
      this.logger.warn(`Email not sent (SMTP not configured): to=${dto.to} subject=${dto.subject}`);
      return { success: false, error: 'SMTP not configured' };
    }

    const from = this.configService.get<string>('SMTP_FROM') ?? 'noreply@travelagency.com';

    try {
      const info = await this.transporter.sendMail({
        from,
        to: dto.toName ? `"${dto.toName}" <${dto.to}>` : dto.to,
        subject: dto.subject,
        text: dto.body,
        html: dto.bodyHtml ?? dto.body,
        attachments: dto.attachments,
      });

      this.logger.log(`Email sent: ${info.messageId} → ${dto.to}`);
      return { success: true, messageId: info.messageId };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Email failed to ${dto.to}: ${msg}`);
      return { success: false, error: msg };
    }
  }
}
