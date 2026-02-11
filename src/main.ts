import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import express from 'express';

const server = express();

export const createNestServer = async (): Promise<any> => {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: '*',
    credentials: true,
  });

  await app.init();
  return server;
};

// Modo serverless (Vercel)
export default async (req: any, res: any) => {
  const app = await createNestServer();
  app(req, res);
};

// Modo servidor local
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  createNestServer().then(() => {
    const port = process.env.PORT || 3000;
    server.listen(port, () => {
      console.log(`🚀 API running on http://0.0.0.0:${port}`);
    });
  });
}
