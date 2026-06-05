/* eslint-disable @typescript-eslint/require-await */
import type { MailProvider, MailSendInput } from '@infrastructure/mail';

export class CapturingMailProvider implements MailProvider {
  private sentMessages: MailSendInput[] = [];

  async sendMail(input: MailSendInput): Promise<void> {
    this.sentMessages.push(input);
  }

  clear(): void {
    this.sentMessages = [];
  }

  getSentMessages(): MailSendInput[] {
    return [...this.sentMessages];
  }

  getLatestSentMessage(): MailSendInput | undefined {
    return this.sentMessages.at(-1);
  }

  extractTokenFromLatestMessage(): string | null {
    const latest = this.getLatestSentMessage();

    if (!latest) {
      return null;
    }

    const text = `${latest.html} ${latest.text ?? ''}`;
    const explicitMatch = text.match(/[?&]token=([0-9a-f]{96})/i);

    if (explicitMatch?.[1]) {
      return explicitMatch[1];
    }

    const fallbackMatch = text.match(/([0-9a-f]{96})/i);

    return fallbackMatch?.[1] ?? null;
  }
}

export class FailingMailProvider implements MailProvider {
  async sendMail(): Promise<void> {
    throw new Error('SMTP provider unavailable');
  }
}

export function createCapturingMailProvider(): CapturingMailProvider {
  return new CapturingMailProvider();
}

export function createFailingMailProvider(): FailingMailProvider {
  return new FailingMailProvider();
}
