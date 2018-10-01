import * as sinon from 'sinon';
import { expect } from 'chai';
import { LogLevel } from 'channelape-logger';

import SqsMessageService from '../../../src/aws/sqs/service/SqsMessageService';
import ErrorReportingService from '../../../src/report/service/ErrorReportingService';
import ErrorReport from '../../../src/report/model/ErrorReport';
import ErrorReportModule from '../../../src/report/model/ErrorReportModule';

describe('ErrorReportingService', () => {
  let errorReportingService: ErrorReportingService;
  let sandbox: sinon.SinonSandbox;
  let sendMessageStub: sinon.SinonStub;
  let errorMessage: ErrorReport;
  let expectedDevMessage: any;
  let expectedProdMessage: any;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sendMessageStub = sandbox.stub(SqsMessageService.prototype, 'sendMessage').resolves({ MessageId: 'message-id' });
    errorReportingService = new ErrorReportingService(
      { accessKeyId: 'access-key', secretKey: 'secret-key', region: 'region' },
      'queue-url',
      LogLevel.ERROR
    );

    errorMessage = {
      channelApeOrderId: '12345',
      channelOrderId: 'channel-order-id',
      message: 'hey this order is broken',
      module: ErrorReportModule.ORDER,
      poNumber: 'po-number'
    };
    expectedProdMessage = {
      channelApeOrder: 'https://app.channelape.com/orders/12345',
      channelOrderId: 'channel-order-id',
      message: 'hey this order is broken',
      module: 'Order',
      poNumber: 'po-number'
    };
    expectedDevMessage = {
      channelApeOrder: 'https://dev.channelape.com/orders/12345',
      channelOrderId: 'channel-order-id',
      message: 'hey this order is broken',
      module: 'Order',
      poNumber: 'po-number'
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('Given queuing an error report, ' +
    'When the error report is received, ' +
    'Then it will add the error to the queue', (done) => {
    errorReportingService.queueError(errorMessage);
    expect(sendMessageStub.callCount).to.equal(1);
    expect(sendMessageStub.args[0][0]).to.deep.equal(expectedProdMessage);
    done();
  });

  it('Given queuing an error report, ' +
    'When the error report is missing an order ID, ' +
    'Then ChannelApe order URL will not be added to the report', (done) => {
    errorMessage.channelApeOrderId = undefined;
    expectedProdMessage.channelApeOrder = undefined;
    errorReportingService.queueError(errorMessage);
    expect(sendMessageStub.callCount).to.equal(1);
    expect(sendMessageStub.args[0][0]).to.deep.equal(expectedProdMessage);
    done();
  });

  it('Given queuing an error report, ' +
    'When the error report is initialized with the staging flag set to true, ' +
    'Then it will set the ChannelApe order link to point to dev.channelape.com', (done) => {
    errorReportingService = new ErrorReportingService(
      { accessKeyId: 'access-key', secretKey: 'secret-key', region: 'region' },
      'queue-url',
      LogLevel.ERROR,
      true
    );
    errorReportingService.queueError(errorMessage);
    expect(sendMessageStub.callCount).to.equal(1);
    expect(sendMessageStub.args[0][0]).to.deep.equal(expectedDevMessage);
    done();
  });
});
