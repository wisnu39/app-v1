import type { NotificationService } from '@modules/notification/services/notification.service';

export const expectNotificationAttempt = (notificationService: NotificationService, email: string): void => {
  const sendEmailMock = Reflect.get(notificationService, 'sendEmail') as jest.Mock;

  expect(sendEmailMock).toHaveBeenCalledWith(
    expect.objectContaining({
      to: email,
    }),
  );
};
