import type { NotificationService } from '@modules/notification/services/notification.service';

export const expectMailSent = (notificationService: NotificationService, to: string, template: string): void => {
  const sendEmailMock = Reflect.get(notificationService, 'sendEmail') as jest.Mock;

  expect(sendEmailMock).toHaveBeenCalledWith(
    expect.objectContaining({
      to,
      template,
    }),
  );
};
