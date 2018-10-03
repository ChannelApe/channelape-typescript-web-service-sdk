import * as sinon from 'sinon';
import { expect } from 'chai';
import { ChannelApeClient, Order, OrderStatus } from 'channelape-sdk';

import SqsMessageService from '../../../src/aws/sqs/service/SqsMessageService';
import ErrorReportingService from '../../../src/report/service/ErrorReportingService';
import ErrorReport from '../../../src/report/model/ErrorReport';
import ErrorReportModule from '../../../src/report/model/ErrorReportModule';

describe('ErrorReportingService', () => {
  let errorReportingService: ErrorReportingService;
  let sandbox: sinon.SinonSandbox;
  let sendMessageStub: sinon.SinonStub;
  let ordersGetStub: sinon.SinonStub;
  let ordersStub: sinon.SinonStub;
  let errorMessage: ErrorReport;
  let channelApeClient: ChannelApeClient;
  let expectedDevMessage: any;
  let expectedProdMessage: any;
  let channelApeOrder: Order;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    sendMessageStub = sandbox.stub(SqsMessageService.prototype, 'sendMessage').resolves({ MessageId: 'message-id' });
    errorReportingService = new ErrorReportingService(
      { accessKeyId: 'access-key', secretKey: 'secret-key', region: 'region' },
      'queue-url',
    );

    errorMessage = {
      channelApeOrderId: '12345',
      channelOrderId: 'channel-order-id',
      message: 'hey this order is broken',
      module: ErrorReportModule.ORDER,
      poNumber: 'po-number',
      businessId: 'business-id'
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
    channelApeOrder = {
      additionalFields: [{ name: 'name', value: 'po-number' }],
      id: '12345',
      channelOrderId: 'channel-order-id',
      channelId: 'channel-id',
      alphabeticCurrencyCode: 'USD',
      businessId: 'business-id',
      purchasedAt: new Date(),
      createdAt: new Date(),
      lineItems: [],
      status: OrderStatus.OPEN,
      updatedAt: new Date()
    };

    ordersGetStub = sandbox.stub().resolves(channelApeOrder);
    ordersStub = sandbox.stub(ChannelApeClient.prototype, 'orders').returns({ get: ordersGetStub });
    channelApeClient = new ChannelApeClient({ sessionId: 'session_id' });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('Given queuing an error report, ' +
    'When the error report is received, ' +
    'Then it will add the error to the queue', () => {
    return errorReportingService.queueError(errorMessage)
      .then(() => {
        expect(ordersGetStub.callCount).to.equal(0);
        expect(sendMessageStub.callCount).to.equal(1);
        expect(sendMessageStub.args[0][0]).to.deep.equal(expectedProdMessage);
      });
  });

  it('Given queuing an error report, ' +
    'When the error report is missing an order ID, ' +
    'Then ChannelApe order URL will not be added to the report', () => {
    errorMessage.channelApeOrderId = undefined;
    expectedProdMessage.channelApeOrder = undefined;
    return errorReportingService.queueError(errorMessage)
      .then(() => {
        expect(ordersGetStub.callCount).to.equal(0);
        expect(sendMessageStub.callCount).to.equal(1);
        expect(sendMessageStub.args[0][0]).to.deep.equal(expectedProdMessage);
      });
  });

  it('Given queuing an error report, ' +
    'When the error report is initialized with the staging flag set to true, ' +
    'Then it will set the ChannelApe order link to point to dev.channelape.com', () => {
    errorReportingService = new ErrorReportingService(
      { accessKeyId: 'access-key', secretKey: 'secret-key', region: 'region' },
      'queue-url',
      true
    );
    return errorReportingService.queueError(errorMessage)
      .then(() => {
        expect(ordersGetStub.callCount).to.equal(0);
        expect(sendMessageStub.callCount).to.equal(1);
        expect(sendMessageStub.args[0][0]).to.deep.equal(expectedDevMessage);
      });
  });

  it('Given queuing an error report, ' +
    'When it is missing an order ID, ' +
    'Then it will get the data from channelape', () => {
    ordersGetStub = sandbox.stub().resolves([channelApeOrder]);
    ordersStub.restore();
    ordersStub = sandbox.stub(ChannelApeClient.prototype, 'orders').returns({ get: ordersGetStub });
    errorReportingService = new ErrorReportingService(
      { accessKeyId: 'access-key', secretKey: 'secret-key', region: 'region' },
      'queue-url',
      false,
      channelApeClient
    );
    errorMessage.channelApeOrderId = undefined;
    return errorReportingService.queueError(errorMessage)
      .then(() => {
        expect(ordersGetStub.callCount).to.equal(1);
        expect(sendMessageStub.callCount).to.equal(1);
        expect(sendMessageStub.args[0][0]).to.deep.equal(expectedProdMessage);
      });
  });

  it('Given queuing an error report, ' +
    'When it is missing a channel order ID, ' +
    'Then it will get the data from channelape', () => {
    errorReportingService = new ErrorReportingService(
      { accessKeyId: 'access-key', secretKey: 'secret-key', region: 'region' },
      'queue-url',
      false,
      channelApeClient
    );
    errorMessage.channelOrderId = undefined;
    return errorReportingService.queueError(errorMessage)
      .then(() => {
        expect(ordersGetStub.callCount).to.equal(1);
        expect(sendMessageStub.callCount).to.equal(1);
        expect(sendMessageStub.args[0][0]).to.deep.equal(expectedProdMessage);
      });
  });

  it('Given queuing an error report, ' +
    'When it is missing a PO number, ' +
    'Then it will get the data from channelape', () => {
    errorReportingService = new ErrorReportingService(
      { accessKeyId: 'access-key', secretKey: 'secret-key', region: 'region' },
      'queue-url',
      false,
      channelApeClient
    );
    errorMessage.poNumber = undefined;
    return errorReportingService.queueError(errorMessage)
      .then(() => {
        expect(ordersGetStub.callCount).to.equal(1);
        expect(sendMessageStub.callCount).to.equal(1);
        expect(sendMessageStub.args[0][0]).to.deep.equal(expectedProdMessage);
      });
  });
});
