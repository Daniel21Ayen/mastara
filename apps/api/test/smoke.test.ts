import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';

describe('NestJS API Smoke Suite (Jest)', () => {
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
        }),
      ],
    }).compile();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('compiles NestJS testing module under Jest', () => {
    expect(moduleRef).toBeDefined();
  });

  it('evaluates basic assertions cleanly', () => {
    expect(1 + 1).toBe(2);
  });
});
