import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import * as express from 'express';

const server = express();
let cachedApp: any;

async function createNestServer() {
  if (!cachedApp) {
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(server),
    );

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
    cachedApp = server;
  }
  return cachedApp;
}

export default async (req: any, res: any) => {
  const app = await createNestServer();
  app(req, res);
};

