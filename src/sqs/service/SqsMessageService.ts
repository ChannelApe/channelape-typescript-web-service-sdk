import * as AWS from 'aws-sdk';
import * as Q from 'q';

import GetMessageOptions from './model/GetMessageOptions';
import DecompressionService from '../../decompression/service/DecompressionService';

const MAX_NUMBER_OF_MESSAGES = 10;

export default class SqsMessageService {
  private readonly sqs: AWS.SQS;
  private readonly sqsReceiveMessageRequest: AWS.SQS.ReceiveMessageRequest;

  constructor(
    awsSecretKey: string,
    awsAccessKeyId: string,
    private readonly sqsQueueUrl: string,
    region = 'us-east-1'
  ) {
    const sqsConfig: AWS.SQS.ClientConfiguration = {
      region,
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

  public async getAllMessages(options?: GetMessageOptions): Promise<AWS.SQS.Message[]> {
    let messages: AWS.SQS.Message[] = [];
    let tryingToGetMessages = true;
    while (tryingToGetMessages) {
      try {
        const messageGroup = await this.getMessageGroup();
        if (messageGroup === undefined || messageGroup.length === 0) {
          tryingToGetMessages = false;
        } else {
          messages = messages.concat(messageGroup);
        }
      } catch (e) {
        if (!this.isRetryableSqsError(e)) {
          throw e;
        }
      }
    }
    return Q.all(messages.map(message => this.finalizeMessage(message, options)));
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

  private async getMessageGroup(): Promise<AWS.SQS.Message[] | undefined> {
    const deferred = Q.defer<AWS.SQS.Message[]>();
    this.sqs.receiveMessage(this.sqsReceiveMessageRequest, (err, data) => {
      if (err) {
        deferred.reject(err);
        return;
      }
      deferred.resolve(data.Messages);
    });
    return deferred.promise;
  }

  private isRetryableSqsError(e: any) {
    return e.retryable !== undefined && e.retryable === true;
  }

  private async finalizeMessage(
    message: AWS.SQS.Message,
    options?: GetMessageOptions
  ): Promise<AWS.SQS.Message> {
    if (options !== undefined && options.decompress === true) {
      return this.decompressMessageBody(message);
    }
    return Q.resolve(message);
  }

  private async decompressMessageBody(message: AWS.SQS.Message): Promise<AWS.SQS.Message> {
    if (message.Body !== undefined) {
      const decompressedBody = await DecompressionService.decompress(message.Body);
      message.Body = decompressedBody;
      return message;
    }
    return Q.resolve(message);
  }
}
