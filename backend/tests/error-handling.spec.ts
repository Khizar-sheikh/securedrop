import { Body, Controller, Get, HttpException, Module, NotFoundException, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { IsString } from 'class-validator';
import { configureApp } from '../src/app/bootstrap';
import { fail } from '../src/common/api-response';
import { ERROR_CODES } from '../src/common/error-codes';

class NameDto {
  @IsString()
  name!: string;
}

@Controller('sample')
class SampleController {
  @Get('ok')
  ok() {
    return { hello: 'world' };
  }

  @Post('validate')
  validate(@Body() body: NameDto) {
    return { received: body };
  }

  @Get('not-found')
  notFound() {
    throw new NotFoundException();
  }

  @Get('explicit')
  explicit() {
    throw new HttpException(fail(ERROR_CODES.SHARE_EXPIRED), 410);
  }

  @Get('crash')
  crash() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).undefinedFn();
  }
}

@Module({ controllers: [SampleController] })
class SampleModule {}

describe('global error handling', () => {
  let app: import('@nestjs/common').INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [SampleModule] }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns success envelope for ok routes', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/sample/ok').expect(200);
    expect(res.body).toEqual({ success: true, data: { hello: 'world' } });
  });

  it('maps validation failures to VALIDATION_FAILED', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/sample/validate')
      .send({ name: 123 })
      .expect(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect(res.body.error.message).toBe('Some of the provided values are not valid.');
  });

  it('maps unknown routes to NOT_FOUND envelope', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/nope').expect(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe(ERROR_CODES.NOT_FOUND);
  });

  it('preserves explicit error codes from controllers', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/sample/explicit').expect(410);
    expect(res.body).toEqual({
      success: false,
      error: { code: ERROR_CODES.SHARE_EXPIRED, message: 'This secure link has expired.' },
    });
  });

  it('never leaks internal error details', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/sample/crash').expect(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
    expect(JSON.stringify(res.body)).not.toContain('password');
  });
});
