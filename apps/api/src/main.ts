import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  // Security Middleware
  app.use(helmet());
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Enable graceful shutdown hooks for Prisma & database connections
  app.enableShutdownHooks();

  // Global API Prefix
  app.setGlobalPrefix("api/v1");

  // Global Validation Pipe with strict security rules
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Mastara Enterprise API")
    .setDescription("Backend API for the Mastara Platform")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, swaggerDocument);

  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT", 4001);

  await app.listen(port, '0.0.0.0');
  logger.log(`Mastara API server is running on: http://localhost:${port}/api/v1`);
  logger.log(`API Swagger documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap();
