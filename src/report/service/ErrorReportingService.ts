import * as uuid from 'uuid';
import { ChannelApeClient, Order } from 'channelape-sdk';

import SqsMessageService from '../../aws/sqs/service/SqsMessageService';
import ErrorReport from '../model/ErrorReport';
import AwsCredentials from '../../aws/model/AwsCredentials';
import ErrorReportModule from '../model/ErrorReportModule';
import AdditionalFieldService from '../../channelape/service/AdditionalFieldService';

export default class ErrorReportingService {
  private readonly sqsMessageService: SqsMessageService;
  private readonly channelApeWebAppDomainName: string;
  private readonly channelApeClient?: ChannelApeClient;
  private readonly businessId?: string;

  constructor(
    awsCredentials: AwsCredentials,
    awsErrorsQueueUrl: string,
    stagingEnvironment = false,
    channelApeClient?: ChannelApeClient,
    businessId?: string
  ) {
    this.channelApeClient = channelApeClient;
    this.businessId = businessId;
    this.channelApeWebAppDomainName = stagingEnvironment ? 'dev.channelape.com' : 'app.channelape.com';
    this.sqsMessageService = new SqsMessageService(
      awsCredentials.secretKey,
      awsCredentials.accessKeyId,
      awsErrorsQueueUrl,
      awsCredentials.region
    );
  }

  public queueError(errorReport: ErrorReport): Promise<{ }> {
    return new Promise((resolve, reject) => {
      if (this.isErrorReportMissingData(errorReport)) {
        this.getMissingData(errorReport)
          .then(errorReport => this.sendMessageToSqs(errorReport))
          .then(reportSent => resolve(reportSent))
          .catch(err => reject(err));
      } else {
        this.sendMessageToSqs(errorReport)
          .then(reportSent => resolve(reportSent))
          .catch(err => reject(err));
      }
    });
  }

  private isErrorReportMissingData(errorReport: ErrorReport): boolean {
    if (this.channelApeClient === undefined || errorReport.module === ErrorReportModule.INVENTORY) {
      return false;
    }
    if (!errorReport.channelApeOrderId || !errorReport.channelOrderId || !errorReport.poNumber) {
      return true;
    }
    return false;
  }

  private getMissingData(errorReport: ErrorReport): Promise<ErrorReport> {
    return new Promise((resolve) => {
      this.getOrderFromErrorReport(errorReport)
        .then((order) => {
          errorReport.channelApeOrderId = order.id;
          errorReport.channelOrderId = order.channelOrderId;
          errorReport.poNumber = AdditionalFieldService.getValue(order.additionalFields, 'name');
          resolve(errorReport);
        })
        .catch(() => resolve(errorReport));
    });
  }

  private getOrderFromErrorReport(errorReport: ErrorReport): Promise<Order> {
    return new Promise((resolve, reject) => {
      if (this.channelApeClient === undefined) {
        return reject();
      }
      if (errorReport.channelApeOrderId) {
        this.channelApeClient.orders()
          .get(errorReport.channelApeOrderId)
          .then(order => resolve(order))
          .catch(err => reject(err));
      } else if (errorReport.channelOrderId && this.businessId) {
        this.channelApeClient.orders()
          .get({ channelOrderId: errorReport.channelOrderId, businessId: this.businessId })
          .then(orders => resolve(orders[0]))
          .catch();
      } else {
        reject();
      }
    });
  }

  private sendMessageToSqs(errorReport: ErrorReport): Promise<{ }> {
    return new Promise((resolve, reject) => {
      const channelApeOrderUrl = `https://${this.channelApeWebAppDomainName}/orders/${errorReport.channelApeOrderId}`;
      const message = {
        module: errorReport.module,
        channelOrderId: errorReport.channelOrderId,
        poNumber: errorReport.poNumber,
        channelApeOrder: errorReport.channelApeOrderId ? channelApeOrderUrl : undefined,
        message: errorReport.message
      };
      this.sqsMessageService.sendMessage(message, uuid.v4())
        .then(() => resolve(errorReport))
        .catch(err => reject(`Failed to queue the following error: ${JSON.stringify(message)} because: ${err}`));
    });
  }
}
