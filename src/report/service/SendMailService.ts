import { Transporter, SendMailOptions, createTransport } from 'nodemailer';
import { SES } from 'aws-sdk';

import AwsCredentials from '../../aws/model/AwsCredentials';
import SendMailRequest from '../model/SendMailRequest';

export default class SendMailService {
  private readonly nodemailerSesTransporter: Transporter;

  constructor(awsCredentials: AwsCredentials) {
    this.nodemailerSesTransporter = createTransport({
      SES: new SES({
        secretAccessKey: awsCredentials.secretKey,
        accessKeyId: awsCredentials.accessKeyId,
        region: awsCredentials.region,
        apiVersion: '2010-12-01'
      })
    });
  }

  public sendMail(sendMailRequest: SendMailRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      const sendMailOptions: SendMailOptions = {
        to: sendMailRequest.recipientsCsv,
        from: sendMailRequest.from,
        subject: sendMailRequest.subject,
        text: sendMailRequest.body
      };
      if (sendMailRequest.attachments) {
        sendMailRequest.attachments.forEach((attachment) => {
          if (!sendMailOptions.attachments) {
            sendMailOptions.attachments = [];
          }
          sendMailOptions.attachments.push({
            filename: attachment.fileName,
            content: attachment.fileContent
          });
        });
      }
      this.nodemailerSesTransporter.sendMail(sendMailOptions, (err, info) => {
        if (err) {
          return reject(`Error sending email: ${err}`);
        }
        resolve(info);
      });
    });
  }
}
