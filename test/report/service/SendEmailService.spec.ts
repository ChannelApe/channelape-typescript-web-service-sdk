import * as sinon from 'sinon';
import { expect } from 'chai';
import * as nodemailer from 'nodemailer';

import SendMailService from '../../../src/report/service/SendMailService';
import SendMailRequest from '../../../src/report/model/SendMailRequest';

describe('ErrorReportingService', () => {
  const sandbox = sinon.createSandbox();
  let sendMailStub = sinon.stub();
  let sendMailRequest: SendMailRequest;

  beforeEach(() => {
    sendMailRequest = {
      recipientsCsv: 'recipient-email-address',
      from: 'noreply@channelapeservices.com',
      subject: 'ChannelApe Allbirds UK Web Service Report - formatted-date',
      body: 'Attached is a report containing items of interest from the latest ChannelApe Sync'
    };
  });

  afterEach(() => sandbox.restore());

  describe('sendMail()', () => {
    context('Given no attachment', () => {
      it('should send the email with correct from, subject, text, and no attachment', () => {
        stubSendEmailSuccess();
        const sendMailService = getNewSendMailService();
        return sendMailService.sendMail(sendMailRequest)
          .then(() => {
            const fromAddress = sendMailStub.args[0][0].from;
            const subject = sendMailStub.args[0][0].subject;
            const text = sendMailStub.args[0][0].text;
            expect(fromAddress).to.equal('noreply@channelapeservices.com');
            expect(subject).to.equal('ChannelApe Allbirds UK Web Service Report - formatted-date');
            expect(text).to.equal('Attached is a report containing items of interest from the latest ChannelApe Sync');
            expect(sendMailStub.calledOnce).to.be.true;
            expect(sendMailStub.args[0][0].attachments).to.be.undefined;
          });
      });
    });

    context('Given an attachment', () => {
      it('should send the email with correct from, subject, text, and an attachment', () => {
        stubSendEmailSuccess();
        const expectedAttachmentContent = 'attachment-content';
        const expectedAttachmentName = 'attachment-name.csv';
        sendMailRequest.attachments = [{ fileName: expectedAttachmentName, fileContent: expectedAttachmentContent }];
        const sendMailService = getNewSendMailService();
        return sendMailService.sendMail(sendMailRequest)
          .then(() => {
            const fromAddress = sendMailStub.args[0][0].from;
            const subject = sendMailStub.args[0][0].subject;
            const text = sendMailStub.args[0][0].text;
            expect(fromAddress).to.equal('noreply@channelapeservices.com');
            expect(subject).to.equal('ChannelApe Allbirds UK Web Service Report - formatted-date');
            expect(text).to.equal('Attached is a report containing items of interest from the latest ChannelApe Sync');
            expect(sendMailStub.calledOnce).to.be.true;
            expect(sendMailStub.args[0][0].attachments).not.to.be.undefined;
            expect(sendMailStub.args[0][0].attachments.length).to.equal(1);
            expect(sendMailStub.args[0][0].attachments[0].filename).to.equal(expectedAttachmentName);
            expect(sendMailStub.args[0][0].attachments[0].content).to.equal(expectedAttachmentContent);
          });
      });
    });

    context('Given multiple attachments', () => {
      it('should send the email with correct from, subject, text, and an attachments', () => {
        stubSendEmailSuccess();
        sendMailRequest.attachments = [
          { fileName: 'file1', fileContent: 'content1' },
          { fileName: 'file2', fileContent: 'content2' },
          { fileName: 'file3', fileContent: 'content3' }
        ];
        const sendMailService = getNewSendMailService();
        return sendMailService.sendMail(sendMailRequest)
          .then(() => {
            const fromAddress = sendMailStub.args[0][0].from;
            const subject = sendMailStub.args[0][0].subject;
            const text = sendMailStub.args[0][0].text;
            expect(fromAddress).to.equal('noreply@channelapeservices.com');
            expect(subject).to.equal('ChannelApe Allbirds UK Web Service Report - formatted-date');
            expect(text).to.equal('Attached is a report containing items of interest from the latest ChannelApe Sync');
            expect(sendMailStub.calledOnce).to.be.true;
            expect(sendMailStub.args[0][0].attachments).not.to.be.undefined;
            expect(sendMailStub.args[0][0].attachments.length).to.equal(3);
            expect(sendMailStub.args[0][0].attachments[0].filename).to.equal('file1');
            expect(sendMailStub.args[0][0].attachments[0].content).to.equal('content1');
            expect(sendMailStub.args[0][0].attachments[1].filename).to.equal('file2');
            expect(sendMailStub.args[0][0].attachments[1].content).to.equal('content2');
            expect(sendMailStub.args[0][0].attachments[2].filename).to.equal('file3');
            expect(sendMailStub.args[0][0].attachments[2].content).to.equal('content3');
          });
      });
    });

    context('Given an error when sending the email', () => {
      it('should should reject', () => {
        stubSendEmailError();
        const sendMailService = getNewSendMailService();
        return sendMailService.sendMail(sendMailRequest)
          .then(() => {
            throw new Error('Should not have resolved');
          })
          .catch((e) => {
            expect(e).to.equal('Error sending email: Error: COULD NOT SEND EMAIL');
          });
      });
    });
  });

  function stubSendEmailError() {
    sendMailStub = sandbox.stub().callsFake((params: any, cb: Function) => {
      cb(new Error('COULD NOT SEND EMAIL'), undefined);
    });
    sandbox.stub(nodemailer, 'createTransport')
      .callsFake((params) => {
        expect(params.SES.config.apiVersion).to.equal('2010-12-01');
        return {
          sendMail: sendMailStub
        };
      });
  }

  function stubSendEmailSuccess() {
    sendMailStub = sandbox.stub().callsFake((params: any, cb: Function) => {
      cb(undefined, 'All good!');
    });
    sandbox.stub(nodemailer, 'createTransport')
      .returns({
        sendMail: sendMailStub
      });
  }

  function getNewSendMailService(): SendMailService {
    return new SendMailService({ accessKeyId: 'access-key-id', region: 'us-east-1', secretKey: 'secret-key' });
  }
});
