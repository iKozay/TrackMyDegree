import nodemailer from 'nodemailer';
import * as Sentry from '@sentry/node';
/*
 * MailService module for sending emails such as password reset links.
 * Supports Ethereal for testing and real SMTP for production.
 */
class MailService {
  private readonly transporter: nodemailer.Transporter;
  private readonly isEthereal: boolean;

  private constructor(
    transporter: nodemailer.Transporter,
    isEthereal: boolean,
  ) {
    this.transporter = transporter;
    this.isEthereal = isEthereal;
  }

  static async create(): Promise<MailService> {
    // default to development environment if NODE_ENV is missing
    const isDevelopment =
      !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
    // use Ethereal for testing in development environment
    if (isDevelopment) {
      const testAccount = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      console.log('Ethereal test account:', testAccount);
      return new MailService(transporter, true);
    }

    // validate required SMTP environment variables for production
    const requiredEnvVars = [
      'EMAIL_USER',
      'SMTP_CLIENT_ID',
      'SMTP_CLIENT_SECRET',
      'SMTP_REFRESH_TOKEN',
      'SMTP_ACCESS_TOKEN',
      'SMTP_TOKEN_EXPIRES',
    ];
    for (const varName of requiredEnvVars) {
      if (!process.env[varName]) {
        throw new Error(`Missing required environment variable: ${varName}`);
      }
    }

    // create transporter for real SMTP server
    const transporter = nodemailer.createTransport({
      // using Gmail SMTP with OAuth2
      service: 'gmail', // nodemailer predefined service configuration (https://github.com/nodemailer/nodemailer/blob/master/lib/well-known/services.json)
      auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.SMTP_CLIENT_ID,
        clientSecret: process.env.SMTP_CLIENT_SECRET,
        refreshToken: process.env.SMTP_REFRESH_TOKEN,
        accessToken: process.env.SMTP_ACCESS_TOKEN,
        expires: Number(process.env.SMTP_TOKEN_EXPIRES),
      },
    });
    return new MailService(transporter, false);
  }

  async sendPasswordReset(
    email: string,
    resetLink: string,
  ): Promise<{ previewUrl?: string }> {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'no-reply@example.com',
        to: email,
        subject: 'Password Reset Link',
        text: `Use this link to reset your password: ${resetLink}`,
        html: `<p>Use this link to reset your password: <a href="${resetLink}">${resetLink}</a></p>`,
      });
      // if using Ethereal, log the preview URL in the console
      if (this.isEthereal) {
        const preview = nodemailer.getTestMessageUrl(info);
        console.log('Preview URL:', preview);
        return { previewUrl: preview || undefined };
      }
      return {};
    } catch (err) {
      Sentry.captureException(err, { tags: { mail: 'passwordReset' } });
      throw err;
    }
  }
}

export const mailServicePromise = MailService.create();
