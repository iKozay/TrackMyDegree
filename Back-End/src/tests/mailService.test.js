jest.mock('nodemailer', () => {
  const mockSendMail = jest.fn().mockResolvedValue({});
  return {
    createTransport: jest.fn(() => ({ sendMail: mockSendMail })),
    getTestMessageUrl: jest.fn().mockReturnValue('preview-url'),
    createTestAccount: jest.fn().mockResolvedValue({
      user: 'test@ethereal.email',
      pass: 'test-password',
      smtp: {
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
      },
    }),
    __mockSendMail: mockSendMail,
  };
});

jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
}));

function loadService() {
  jest.resetModules();
  // re-require after reset so we get the fresh mock instance
  const svcModule = require('../services/mailService');
  const nodemailer = require('nodemailer');
  return { servicePromise: svcModule.mailServicePromise, nodemailer };
}

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.NODE_ENV;
  // Clean up any SMTP env vars to avoid validation errors
  delete process.env.EMAIL_USER;
  delete process.env.SMTP_CLIENT_ID;
  delete process.env.SMTP_CLIENT_SECRET;
  delete process.env.SMTP_REFRESH_TOKEN;
});

describe('MailService', () => {
  test('should use Ethereal when NODE_ENV=development', async () => {
    process.env.NODE_ENV = 'development';
    const { servicePromise, nodemailer } = loadService();
    const service = await servicePromise;
    const mockSendMail = nodemailer.__mockSendMail;

    const result = await service.sendPasswordReset(
      'dev@example.com',
      'https://x/reset/123',
    );

    expect(nodemailer.createTestAccount).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'dev@example.com',
        subject: 'Password Reset Link',
        html: expect.stringContaining('https://x/reset/123'),
      }),
    );
    expect(nodemailer.getTestMessageUrl).toHaveBeenCalledTimes(1);
    expect(result.previewUrl).toBe('preview-url');
  });

  test('should use Ethereal when NODE_ENV is missing (defaults to development)', async () => {
    const { servicePromise, nodemailer } = loadService();
    const service = await servicePromise;
    const mockSendMail = nodemailer.__mockSendMail;

    const result = await service.sendPasswordReset(
      'missing@example.com',
      'https://x/reset/456',
    );

    expect(nodemailer.createTestAccount).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalled();
    expect(nodemailer.getTestMessageUrl).toHaveBeenCalledTimes(1);
    expect(result.previewUrl).toBe('preview-url');
  });

  test('should use Gmail service when NODE_ENV=production with valid credentials', async () => {
    process.env.NODE_ENV = 'production';
    // Set required SMTP environment variables
    process.env.EMAIL_USER = 'test@gmail.com';
    process.env.SMTP_CLIENT_ID = 'client-id';
    process.env.SMTP_CLIENT_SECRET = 'client-secret';
    process.env.SMTP_REFRESH_TOKEN = 'refresh-token';

    const { servicePromise, nodemailer } = loadService();
    const service = await servicePromise;
    const mockSendMail = nodemailer.__mockSendMail;

    const result = await service.sendPasswordReset(
      'prod@example.com',
      'https://x/reset/789',
    );

    expect(nodemailer.createTestAccount).not.toHaveBeenCalled();
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'prod@example.com',
        subject: 'Password Reset Link',
        html: expect.stringContaining('https://x/reset/789'),
      }),
    );
    expect(nodemailer.getTestMessageUrl).not.toHaveBeenCalled();
    expect(result.previewUrl).toBeUndefined();
  });

  test('should throw error when production environment is missing SMTP credentials', async () => {
    process.env.NODE_ENV = 'production';
    const { servicePromise } = loadService();

    await expect(servicePromise).rejects.toThrow(
      'Missing required environment variables: EMAIL_USER, SMTP_CLIENT_ID, SMTP_CLIENT_SECRET, SMTP_REFRESH_TOKEN',
    );
  });

  test('should capture error with Sentry and re-throw when sendMail fails', async () => {
    process.env.NODE_ENV = 'development';
    const { servicePromise, nodemailer } = loadService();
    const service = await servicePromise;
    const mockSendMail = nodemailer.__mockSendMail;
    const Sentry = require('@sentry/node');

    // make sendMail throw an error
    const testError = new Error('SMTP connection failed');
    mockSendMail.mockRejectedValueOnce(testError);

    await expect(
      service.sendPasswordReset('error@example.com', 'https://x/reset/error'),
    ).rejects.toThrow('SMTP connection failed');

    expect(Sentry.captureException).toHaveBeenCalledWith(testError, {
      tags: { mail: 'passwordReset' },
    });
  });
});
