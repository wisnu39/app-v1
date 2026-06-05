import { jest } from '@jest/globals';
import type { NotificationService } from '@modules/notification/services/notification.service';
import type { Mockify } from '../../types/mockify.type';

export function createNotificationMock(): Mockify<NotificationService> {
  return {
    sendEmail: jest.fn(),
    fireAndForgetEmail: jest.fn(),
  } as unknown as Mockify<NotificationService>;
}
