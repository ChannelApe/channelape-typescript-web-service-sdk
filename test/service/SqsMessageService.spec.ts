import { expect } from 'chai';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as AppRootPath from 'app-root-path';
import * as AWS from 'aws-sdk';

import SqsMessageService from '../../src/service/sqsMessageService/SqsMessageService';

const validCompressedString =
  fs.readFileSync(`${AppRootPath}/test/resources/service/sqs-messages/gzip-valid.txt`, 'utf-8');
const invalidCompressedString =
  fs.readFileSync(`${AppRootPath}/test/resources/service/sqs-messages/gzip-invalid.txt`, 'utf-8');
const validCompressedSqsMessage = {
  Body: validCompressedString,
  ReceiptHandle: 'receipt_handle_valid_gzip',
  MessageId: 'message_id_valid_gzip'
};
const invalidCompressedSqsMessage = {
  Body: invalidCompressedString,
  ReceiptHandle: 'receipt_handle_invalid_gzip',
  MessageId: 'message_id_invalid_gzip'
};
const retryableAwsError = {
  retryable: true
};
const nonRetryableAwsError = {
  message: 'Non-retryable error',
  retryable: false
};

describe('SqsMessageService', () => {

  let sandbox: sinon.SinonSandbox;
  let sqsDeleteMessageStub: sinon.SinonStub;
  let sqsReceiveMessageStub: sinon.SinonStub | undefined;
  let sqsStub: sinon.SinonStub;

  beforeEach(() => {
    sandbox = sinon.createSandbox();

    if (sqsReceiveMessageStub !== undefined) {
      sqsReceiveMessageStub = undefined;
    }
    sqsReceiveMessageStub = sandbox.stub();
    sqsReceiveMessageStub.onFirstCall().callsFake((request, cb) => {
      cb(null, {
        Messages: [
          validCompressedSqsMessage, validCompressedSqsMessage, validCompressedSqsMessage, validCompressedSqsMessage,
          validCompressedSqsMessage, validCompressedSqsMessage, validCompressedSqsMessage, validCompressedSqsMessage,
          validCompressedSqsMessage, validCompressedSqsMessage
        ]
      });
    });
    sqsReceiveMessageStub.onSecondCall().callsFake((request, cb) => {
      cb(retryableAwsError, undefined);
    });
    sqsReceiveMessageStub.onThirdCall().callsFake((request, cb) => {
      cb(null, {
        Messages: [
          validCompressedSqsMessage, validCompressedSqsMessage, validCompressedSqsMessage
        ]
      });
    });
    sqsReceiveMessageStub.onCall(3).callsFake((request, cb) => { cb(null, {}); });
    sqsStub = sandbox.stub(AWS, 'SQS').returns({
      receiveMessage: sqsReceiveMessageStub,
      deleteMessage: sqsDeleteMessageStub
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('getMessages()', () => {
    describe('Given a non retryable error response from AWS SQS receiveMessage', () => {
      it('Expect a rejected promise', () => {
        sqsReceiveMessageStub = sandbox.stub();
        sqsReceiveMessageStub.onFirstCall().callsFake((request, cb) => {
          cb(nonRetryableAwsError, undefined);
        });
        sqsStub.restore();
        sqsStub = sandbox.stub(AWS, 'SQS').returns({
          receiveMessage: sqsReceiveMessageStub,
          deleteMessage: sqsDeleteMessageStub
        });
        const sqsMessageService = new SqsMessageService('aws_secret_key', 'aws_access_key_id', 'queue_url');
        return sqsMessageService.getAllMessages()
          .then(() => {
            throw new Error('Should not have gotten any messages');
          })
          .catch((e) => {
            expect(e.message).to.equal('Non-retryable error');
          });
      });
    });

    describe('Given a retryable error response from AWS SQS receiveMessage 2nd call but success for all others', () => {
      it('When decompressing the message Expect a resolved promise', (done) => {
        const sqsMessageService = new SqsMessageService('aws_secret_key', 'aws_access_key_id', 'queue_url');
        sqsMessageService.getAllMessages({ decompress: true })
          .then((messages) => {
            expect(messages.length).to.equal(13);
            expect(messages[0].Body).to.equal('this,is,a,valid,gzipped,string');
            done();
          }).catch((e) => { done(new Error('Failed')); });
      });
    });

    describe('Given a retryable error response from AWS SQS receiveMessage 2nd call but success for all others', () => {
      it('When NOT decompressing the message Expect a resolved promise', (done) => {
        const sqsMessageService = new SqsMessageService('aws_secret_key', 'aws_access_key_id', 'queue_url');
        sqsMessageService.getAllMessages()
          .then((messages) => {
            expect(messages.length).to.equal(13);
            expect(messages[0]!.Body!).to.equal(validCompressedString);
            done();
          }).catch((e) => { done(new Error('Failed')); });
      });
    });

    describe('acknowledgeMessage()', () => {
      describe('Given a message missing a receipt handle', () => {
        it('Expect a rejected promise', () => {
          sqsDeleteMessageStub = sandbox.stub().callsFake((request, cb) => { cb(); });
          sqsStub.restore();
          sqsStub = sandbox.stub(AWS, 'SQS').returns({
            receiveMessage: sqsReceiveMessageStub,
            deleteMessage: sqsDeleteMessageStub
          });
          const sqsMessageService = new SqsMessageService('aws_secret_key', 'aws_access_key_id', 'queue_url');
          return sqsMessageService.acknowledgeMessage({} as any)
            .then(() => {
              throw new Error('Should not have acknowledged the message');
            })
            .catch((e) => {
              expect(e.message).to.equal('Receipt Handle on message is undefined');
            });
        });
      });

      describe('Given sqs delete message fails', () => {
        it('Expect a rejected promise', () => {
          sqsDeleteMessageStub = sandbox.stub().callsFake((request, cb) => { cb(new Error('ERROR')); });
          sqsStub.restore();
          sqsStub = sandbox.stub(AWS, 'SQS').returns({
            receiveMessage: sqsReceiveMessageStub,
            deleteMessage: sqsDeleteMessageStub
          });
          const sqsMessageService = new SqsMessageService('aws_secret_key', 'aws_access_key_id', 'queue_url');
          return sqsMessageService.acknowledgeMessage(invalidCompressedSqsMessage)
            .then(() => {
              throw new Error('Should not have acknowledged the message');
            })
            .catch((e) => {
              expect(e).to.equal('Message "message_id_invalid_gzip" not acknowledged.');
            });
        });
      });

      describe('Given sqs delete message succeeds', () => {
        it('Expect a resolved promise', () => {
          sqsDeleteMessageStub = sandbox.stub().callsFake((request, cb) => { cb(); });
          sqsStub.restore();
          sqsStub = sandbox.stub(AWS, 'SQS').returns({
            receiveMessage: sqsReceiveMessageStub,
            deleteMessage: sqsDeleteMessageStub
          });
          const sqsMessageService = new SqsMessageService('aws_secret_key', 'aws_access_key_id', 'queue_url');
          return sqsMessageService.acknowledgeMessage(invalidCompressedSqsMessage)
            .then((result) => {
              expect(result).to.equal('Message "message_id_invalid_gzip" acknowledged.');
            });
        });
      });
    });
  });
});
