import { Body, Controller, Module, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsEmail, IsString, MinLength } from 'class-validator';
import request from 'supertest';
import { configureApp } from '../src/app/bootstrap';

class SampleDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(3)
  name!: string;
}

@Controller('sample')
class SampleController {
  @Post()
  create(@Body() body: SampleDto) {
    return { received: body };
  }
}

@Module({ controllers: [SampleController] })
class SampleModule {}

describe('global validation pipe', () => {
  let app: import('@nestjs/common').INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [SampleModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts a valid payload', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/sample')
      .send({ email: 'a@b.com', name: 'khizar' })
      .expect(201);
    expect(res.body).toEqual({
      success: true,
      data: { received: { email: 'a@b.com', name: 'khizar' } },
    });
  });

  it('rejects an invalid payload', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/sample')
      .send({ email: 'not-an-email', name: 'k' })
      .expect(400);
  });

  it('rejects unknown properties', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/sample')
      .send({ email: 'a@b.com', name: 'khizar', evil: 'x' })
      .expect(400);
  });
});
