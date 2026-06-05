import { jest } from '@jest/globals';
import { NotificationService } from '@modules/notification/services/notification.service';

export function createNotificationServiceMock(): jest.Mocked<NotificationService> {
  return {
    sendEmail: jest.fn(),
    fireAndForgetEmail: jest.fn(),
  } as unknown as jest.Mocked<NotificationService>;
}
