import { Logger, LogLevel } from 'channelape-logger';
import * as uuid from 'uuid';

import SqsMessageService from '../../aws/sqs/service/SqsMessageService';
import ErrorReport from '../model/ErrorReport';
import AwsCredentials from '../../aws/model/AwsCredentials';

export default class ErrorReportingService {
  private readonly sqsMessageService: SqsMessageService;
  private readonly logger: Logger;
  private readonly channelApeWebAppDomainName: string;

  constructor(
    awsCredentials: AwsCredentials,
    awsErrorsQueueUrl: string,
    logLevel: LogLevel | string,
    stagingEnvironment = false
  ) {
    this.channelApeWebAppDomainName = stagingEnvironment ? 'dev.channelape.com' : 'app.channelape.com';
    this.logger = new Logger('Error Reporting Service', logLevel);
    this.sqsMessageService = new SqsMessageService(
      awsCredentials.secretKey,
      awsCredentials.accessKeyId,
      awsErrorsQueueUrl,
      awsCredentials.region
    );
  }

  public queueError(errorReport: ErrorReport): void {
    const channelApeOrderUrl = `https://${this.channelApeWebAppDomainName}/orders/${errorReport.channelApeOrderId}`;
    const message = {
      module: errorReport.module,
      channelOrderId: errorReport.channelOrderId,
      poNumber: errorReport.poNumber,
      channelApeOrder: errorReport.channelApeOrderId ? channelApeOrderUrl : undefined,
      message: errorReport.message
    };
    this.sqsMessageService.sendMessage(message, uuid.v4())
      .catch(err => this.logger.error('Failed to queue the following error: ' +
        `${JSON.stringify(message)} because: ${err}`));
  }
}
