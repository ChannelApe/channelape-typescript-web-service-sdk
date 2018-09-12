import SqsMessageService from '../../aws/sqs/service/SqsMessageService';
import { Logger, LogLevel } from 'channelape-logger';

import ErrorReport from '../model/ErrorReport';
import AwsCredentials from '../../aws/model/AwsCredentials';

export default class ErrorReportingService {
  private readonly sqsMessageService: SqsMessageService;
  private readonly logger: Logger;

  constructor(awsCredentials: AwsCredentials, awsErrorsQueueUrl: string, logLevel: LogLevel | string) {
    this.logger = new Logger('Error Reporting Service', logLevel);
    this.sqsMessageService = new SqsMessageService(
      awsCredentials.secretKey,
      awsCredentials.accessKeyId,
      awsErrorsQueueUrl,
      awsCredentials.region
    );
  }

  public queueError(params: ErrorReport): void {
    const message = {
      module: params.module,
      channelOrderId: params.channelOrderId,
      poNumber: params.poNumber,
      channelApeOrder: `https://app.channelape.com/orders/${params.channelApeOrderId}`,
      message: params.message
    };
    this.sqsMessageService.sendMessage(message, 'Error_Reports')
      .catch(err => this.logger.error('Failed to queue the following error: ' +
        `${JSON.stringify(message)} because: ${err}`));
  }
}
