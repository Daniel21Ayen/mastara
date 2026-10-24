import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security Headers via Helmet
  app.use(helmet());

  // Strict CORS Configuration from CORS_ORIGIN
  const rawCorsOrigin = configService.get<string>("CORS_ORIGIN", "");
  const allowedOrigins = rawCorsOrigin
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  logger.log(`Active CORS Allowed Origins: [${allowedOrigins.join(", ")}]`);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. native mobile app, server-to-server, or local tools)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      logger.warn(`CORS rejected cross-origin request from unlisted origin: ${origin}`);
      return callback(
        new UnauthorizedException(`CORS error: Origin '${origin}' is not allowed by CORS_ORIGIN policy.`),
        false,
      );
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "X-CSRF-Token",
      "x-device-id",
    ],
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

  const port = configService.get<number>("PORT", 4001);

  await app.listen(port, "0.0.0.0");
  logger.log(`Mastara API server is running on: http://localhost:${port}/api/v1`);
  logger.log(`API Swagger documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap();
