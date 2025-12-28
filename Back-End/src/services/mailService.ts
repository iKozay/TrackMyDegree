import nodemailer from 'nodemailer';
import * as Sentry from '@sentry/node';
import { requiredEnv } from '@utils/requiredEnv';
/*
 * MailService module for sending emails such as password reset links.
 * Supports Ethereal for testing and real SMTP for production.
 */
class MailService {
  private readonly transporter: nodemailer.Transporter;
  private readonly isEthereal: boolean;
  private readonly senderEmail: string;

  private constructor(
    transporter: nodemailer.Transporter,
    isEthereal: boolean,
    fromAddress: string,
  ) {
    this.transporter = transporter;
    this.isEthereal = isEthereal;
    this.senderEmail = fromAddress;
  }

  static async create(): Promise<MailService> {
    // default to development environment if NODE_ENV is missing
    const isDevelopment =
      !process.env.NODE_ENV || process.env.NODE_ENV === 'development'|| process.env.NODE_ENV === 'test';
    // use Ethereal for testing in development environment
    if (isDevelopment) {
      const testAccount = await nodemailer.createTestAccount();
      const transporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: { user: testAccount.user, pass: testAccount.pass },
      });
      console.log('Ethereal test account:', testAccount);
      return new MailService(transporter, true, testAccount.user);
    }

    // validate required SMTP environment variables for production
    const {
      EMAIL_USER,
      SMTP_CLIENT_ID,
      SMTP_CLIENT_SECRET,
      SMTP_REFRESH_TOKEN,
    } = requiredEnv([
      'EMAIL_USER',
      'SMTP_CLIENT_ID',
      'SMTP_CLIENT_SECRET',
      'SMTP_REFRESH_TOKEN',
    ]);

    // create transporter for real SMTP server
    const transporter = nodemailer.createTransport({
      // using Gmail SMTP with OAuth2
      service: 'gmail', // nodemailer predefined service configuration (https://github.com/nodemailer/nodemailer/blob/master/lib/well-known/services.json)
      auth: {
        type: 'OAuth2',
        user: EMAIL_USER,
        clientId: SMTP_CLIENT_ID,
        clientSecret: SMTP_CLIENT_SECRET,
        refreshToken: SMTP_REFRESH_TOKEN,
      },
    });
    return new MailService(transporter, false, EMAIL_USER);
  }

  async sendPasswordReset(
    recepientEmail: string,
    resetLink: string,
  ): Promise<{ previewUrl?: string }> {
    try {
      const info = await this.transporter.sendMail({
        from: this.senderEmail,
        to: recepientEmail,
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
