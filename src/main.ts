import "dotenv/config"
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { RedisStore } from "connect-redis";
import { createClient } from "redis"
import { AppModule } from './app.module';
import cookieParser from "cookie-parser";
import session from "express-session";

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  const redisClient = createClient({
    url: `redis://localhost:${process.env.REDIS_PORT || 6479}`
  })

  redisClient.connect().catch(console.error)

  const redisStore = new RedisStore({
    client: redisClient,
    prefix: "smartspace:sess:"
  })

  app.use(cookieParser())

  app.use(
    session({
      store: redisStore,
      secret: process.env.REDIS_SECRET_KEY as string,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24 * 7
      }
    })
  )

  app.setGlobalPrefix("api")

  app.enableCors({
    origin: "http://localhost:5173",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  })

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }))

  await app.listen(process.env.PORT ?? 3000)
}
bootstrap();
