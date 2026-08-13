import {
    SESClient,
    SendEmailCommand,
} from '@aws-sdk/client-ses';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);

    private readonly sesClient: SESClient;

    constructor(private readonly configService: ConfigService) {
        this.sesClient = new SESClient({
            region: this.configService.getOrThrow<string>('AWS_REGION'),
        });
    }

    async sendEmail(params: {
        to: string;
        subject: string;
        text: string;
        html?: string;
    }) {
        const command = new SendEmailCommand({
            Source: this.configService.getOrThrow<string>('SES_FROM_EMAIL'),
            Destination: {
                ToAddresses: [params.to],
            },
            Message: {
                Subject: {
                    Charset: 'UTF-8',
                    Data: params.subject,
                },
                Body: {
                    Text: {
                        Charset: 'UTF-8',
                        Data: params.text,
                    },
                    ...(params.html && {
                        Html: {
                            Charset: 'UTF-8',
                            Data: params.html,
                        },
                    }),
                },
            },
        });

        return this.sesClient.send(command);
    }

    async sendWelcomeEmail(
        email: string,
        name?: string,
    ): Promise<void> {

        const displayName = name?.trim() || 'there';

        try {
            await this.sendEmail({
                to: email,
                subject: 'Welcome to AWS File Manager 🎉',
                text: [
                    `Hello ${displayName},`,
                    '',
                    'Welcome to AWS File Manager!',
                    '',
                    'Your account has been created successfully.',
                    '',
                    'Thank you for joining us.',
                ].join('\n'),
                html: `
              <!DOCTYPE html>
              <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                  <h2>Welcome to AWS File Manager 🎉</h2>

                  <p>Hello ${displayName},</p>

                  <p>
                    Your account has been created successfully.
                  </p>

                  <p>
                    You can now start using AWS File Manager
                    to manage your files.
                  </p>

                  <p>Thank you for joining us!</p>
                </body>
              </html>
            `,
            });

            this.logger.log(`Welcome email sent to ${email}`);
        } catch (error) {
            this.logger.error(
                `Failed to send welcome email to ${email}`,
                error instanceof Error ? error.stack : String(error),
            );
        }
    }
}