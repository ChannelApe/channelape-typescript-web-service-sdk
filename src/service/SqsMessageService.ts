import * as AWS from 'aws-sdk';
import * as Q from 'q';

const MAX_NUMBER_OF_MESSAGES = 10;

export default class SqsMessageService {
  private sqs: AWS.SQS;
  private sqsReceiveMessageRequest: AWS.SQS.ReceiveMessageRequest;

  constructor (awsSecretKey: string, awsAccessKeyId: string, private readonly sqsQueueUrl: string) {
    const sqsConfig: AWS.SQS.ClientConfiguration = {
      accessKeyId: awsSecretKey,
      secretAccessKey: awsAccessKeyId
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

  public getAllMessages(): Q.Promise<AWS.SQS.Message[]> {
    const allMessagesRetrievedDeferred = Q.defer<AWS.SQS.Message[]>();
    this.getMessages(allMessagesRetrievedDeferred, []);
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

  private getMessages(allMessagesRetrievedDeferred: Q.Deferred<AWS.SQS.Message[]>, messages: AWS.SQS.Message[]): void {
    this.sqs.receiveMessage(this.sqsReceiveMessageRequest, (err, data) => {
      if (err) {
        if (err.retryable) {
          this.getMessages(allMessagesRetrievedDeferred, messages);
          return;
        }
        allMessagesRetrievedDeferred.reject(err);
        return;
      }
      let combinedMessages = messages;
      if (data.Messages === undefined) {
        allMessagesRetrievedDeferred.resolve(combinedMessages);
        return;
      }
      combinedMessages = messages.concat(data.Messages);
      this.getMessages(allMessagesRetrievedDeferred, combinedMessages);
    });
  }
}
