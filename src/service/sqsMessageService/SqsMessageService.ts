import * as AWS from 'aws-sdk';
import * as Q from 'q';

import GetMessageOptions from './model/GetMessageOptions';
import DecompressionService from '../decompressionService/DecompressionService';

const MAX_NUMBER_OF_MESSAGES = 10;

export default class SqsMessageService {
  private sqs: AWS.SQS;
  private sqsReceiveMessageRequest: AWS.SQS.ReceiveMessageRequest;

  constructor(awsSecretKey: string, awsAccessKeyId: string, private readonly sqsQueueUrl: string) {
    const sqsConfig: AWS.SQS.ClientConfiguration = {
      accessKeyId: awsAccessKeyId,
      secretAccessKey: awsSecretKey
    };
    this.sqs = new AWS.SQS(sqsConfig);
    this.sqsReceiveMessageRequest = {
      QueueUrl: this.sqsQueueUrl,
      MaxNumberOfMessages: MAX_NUMBER_OF_MESSAGES
    };
  }

  get QueueUrl(): string {
    return this.sqsQueueUrl;
  }

  public getAllMessages(options?: GetMessageOptions): Q.Promise<AWS.SQS.Message[]> {
    const allMessagesRetrievedDeferred = Q.defer<AWS.SQS.Message[]>();
    this.getMessages(allMessagesRetrievedDeferred, [], options);
    return allMessagesRetrievedDeferred.promise;
  }

  public acknowledgeMessage(message: AWS.SQS.Message): Q.Promise<any> {
    const deferred = Q.defer<any>();
    if (message.ReceiptHandle === undefined) {
      return Q.reject(new Error('Receipt Handle on message is undefined'));
    }
    this.sqs.deleteMessage({
      QueueUrl: this.sqsQueueUrl,
      ReceiptHandle: message.ReceiptHandle
    }, (err) => {
      if (err) {
        deferred.reject(`Message "${message.MessageId}" not acknowledged.`);
        return;
      }
      deferred.resolve(`Message "${message.MessageId}" acknowledged.`);
    });
    return deferred.promise;
  }

  private getMessages(
    allMessagesRetrievedDeferred: Q.Deferred<AWS.SQS.Message[]>,
    messages: AWS.SQS.Message[],
    options?: GetMessageOptions
  ): void {
    this.sqs.receiveMessage(this.sqsReceiveMessageRequest, (err, data) => {
      if (err) {
        if (err.retryable) {
          this.getMessages(allMessagesRetrievedDeferred, messages, options);
          return;
        }
        allMessagesRetrievedDeferred.reject(err);
        return;
      }
      let combinedMessages = messages;
      if (data.Messages === undefined) {
        this.finalizeMessages(allMessagesRetrievedDeferred, messages, options);
        return;
      }
      combinedMessages = messages.concat(data.Messages);
      this.getMessages(allMessagesRetrievedDeferred, combinedMessages, options);
    });
  }

  private finalizeMessages(
    allMessagesRetrievedDeferred: Q.Deferred<AWS.SQS.Message[]>,
    messages: AWS.SQS.Message[],
    options?: GetMessageOptions
  ) {
    if (options !== undefined && options.decompress === true) {
      const decompressedMessagePromises = messages.map(this.decompressMessageBody);
      Q.all(decompressedMessagePromises)
        .then(decompressedMessages => allMessagesRetrievedDeferred.resolve(decompressedMessages))
        .catch((e) => {
          allMessagesRetrievedDeferred.reject(`Decompressing all messages failed: ${e.message}`);
        });
      return;
    }
    allMessagesRetrievedDeferred.resolve(messages);
  }

  private decompressMessageBody(message: AWS.SQS.Message): Q.Promise<AWS.SQS.Message> {
    if (message.Body !== undefined) {
      return DecompressionService.decompress(message.Body)
        .then((decompressedMessageBody) => {
          message.Body! = decompressedMessageBody;
          return message;
        });
    }
    return Q.resolve(message);
  }
}
