import { INestApplication, ValidationPipe } from '@nestjs/common';

export async function bootstrapApp(app: INestApplication): Promise<void> {
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
}
