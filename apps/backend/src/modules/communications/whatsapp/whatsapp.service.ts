import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface SendWhatsAppDto {
  to: string;
  message: string;
  templateName?: string;
  templateParams?: string[];
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(private readonly configService: ConfigService) {}

  private get apiUrl(): string {
    return this.configService.get<string>('WHATSAPP_API_URL') ?? 'https://graph.facebook.com/v18.0';
  }

  private get phoneNumberId(): string | undefined {
    return this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
  }

  private get accessToken(): string | undefined {
    return this.configService.get<string>('WHATSAPP_ACCESS_TOKEN');
  }

  private get isConfigured(): boolean {
    return !!(this.phoneNumberId && this.accessToken);
  }

  async sendText(dto: SendWhatsAppDto): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured) {
      this.logger.warn(`WhatsApp not configured — message not sent to ${dto.to}`);
      return { success: false, error: 'WhatsApp Business API not configured' };
    }

    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: dto.to.replace(/[^0-9]/g, ''),
          type: 'text',
          text: { body: dto.message },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const messageId = response.data?.messages?.[0]?.id;
      this.logger.log(`WhatsApp sent: ${messageId} → ${dto.to}`);
      return { success: true, messageId };
    } catch (error: unknown) {
      const msg = axios.isAxiosError(error)
        ? error.response?.data?.error?.message ?? error.message
        : String(error);
      this.logger.error(`WhatsApp failed to ${dto.to}: ${msg}`);
      return { success: false, error: msg };
    }
  }

  async sendTemplate(to: string, templateName: string, languageCode = 'it', components?: unknown[]) {
    if (!this.isConfigured) {
      return { success: false, error: 'WhatsApp Business API not configured' };
    }

    try {
      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to.replace(/[^0-9]/g, ''),
          type: 'template',
          template: {
            name: templateName,
            language: { code: languageCode },
            ...(components && { components }),
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return { success: true, messageId: response.data?.messages?.[0]?.id };
    } catch (error: unknown) {
      const msg = axios.isAxiosError(error)
        ? error.response?.data?.error?.message ?? error.message
        : String(error);
      return { success: false, error: msg };
    }
  }
}
