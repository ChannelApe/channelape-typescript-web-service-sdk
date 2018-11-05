import * as sinon from 'sinon';
import { ChannelApeClient, Environment, Action, ActionProcessingStatus } from 'channelape-sdk';
import { expect } from 'chai';
import { mockReq, mockRes } from 'sinon-express-mock';
import { Logger } from 'channelape-logger';
import * as Q from 'q';
import * as timers from 'timers';

const timeout = (ms: number) => new Promise(res => setTimeout(res, ms));

import ChannelApeActionsController from '../../../src/channelape/controller/ChannelApeActionsController';
import Secrets from '../../../src/environment/model/Secrets';

const channelApeClient = new ChannelApeClient({
  endpoint: Environment.STAGING,
  sessionId: 'valid-session-id-test'
});

class GenericControllerThatErrs extends ChannelApeActionsController {
  constructor() {
    super('LoggerName', channelApeClient);
  }

  protected processAction(businessId: string, actionId: string): Q.Promise<boolean> {
    const deferred = Q.defer<boolean>();
    setTimeout(() => {
      deferred.reject(new Error('BOOM!'));
    }, 150);
    return deferred.promise;
  }
}

class GenericControllerThatResolves extends ChannelApeActionsController {
  constructor() {
    super('LoggerName', channelApeClient);
  }

  protected processAction(businessId: string, actionId: string): Q.Promise<boolean> {
    const deferred = Q.defer<boolean>();
    setTimeout(() => {
      this.complete(actionId);
      deferred.resolve(true);
    }, 200);
    return deferred.promise;
  }
}

describe('ChannelApeActionsController', () => {
  let sandbox: sinon.SinonSandbox;
  let infoLoggerStub: sinon.SinonStub;
  let errorLoggerStub: sinon.SinonStub;
  let updateActionStub: sinon.SinonStub;
  let completeActionStub: sinon.SinonStub;
  let errorActionStub: sinon.SinonStub;
  let clearIntervalSpy: sinon.SinonSpy;
  const action: Action = {
    action: 'Test Action',
    businessId: 'businessId',
    description: 'description',
    healthCheckIntervalInSeconds: 555,
    id: 'action_id',
    processingStatus: ActionProcessingStatus.IN_PROGRESS,
    lastHealthCheckTime: new Date(),
    startTime: new Date(),
    targetId: 'targetId',
    targetType: ''
  };

  beforeEach(() => {
    Secrets.env.LOG_LEVEL = 'info';
    action.processingStatus = ActionProcessingStatus.IN_PROGRESS;
    sandbox = sinon.createSandbox();
    clearIntervalSpy = sandbox.spy(timers, 'clearInterval');
    updateActionStub = sandbox.stub().callsFake((actionId) => {
      if (clearIntervalSpy.callCount >= 3) {
        throw new Error('Update action was called AFTER each update action interval was supposedly cleared');
      }
      if (action.processingStatus === ActionProcessingStatus.COMPLETED) {
        return Promise.reject({
          errors: [{
            code: 113,
            message: 'Action has already been completed.'
          }]
        });
      }
      return Promise.resolve({ healthCheckIntervalInSeconds: 0.01 });
    });
    completeActionStub = sandbox.stub().callsFake((actionId) => {
      if (action.processingStatus === ActionProcessingStatus.COMPLETED) {
        return Promise.reject({
          errors: [{
            code: 113,
            message: 'Action has already been completed.'
          }]
        });
      }
      if (actionId === action.id) {
        action.processingStatus = ActionProcessingStatus.COMPLETED;
        return Promise.resolve();
      }
      return Promise.reject({
        errors: [{
          code: 111,
          message: 'Action could not be found.'
        }]
      });
    });
    errorActionStub = sandbox.stub().resolves();
    sandbox.stub(ChannelApeClient.prototype, 'actions').returns({
      updateHealthCheck: updateActionStub,
      complete: completeActionStub,
      error: errorActionStub
    });

    infoLoggerStub = sandbox.stub(Logger.prototype, 'info').callThrough();
    errorLoggerStub = sandbox.stub(Logger.prototype, 'error').callThrough();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('Given processing an action, ' +
    'When the action ID is valid, ' +
    'And process action errs ' +
    'Then error out the ChannelApe Action', () => {
    const expectedActionId = 'action_id';
    const request = { body: { actionId: expectedActionId } };
    const req = mockReq(request);
    const res = mockRes();
    const errorController = new GenericControllerThatErrs();
    return errorController.handle(req, res)
      .then(() => {
        expect(clearIntervalSpy.calledOnce).to.be.true;
        expect(infoLoggerStub.args[0][0]).to.equal(`Updating healthcheck for action ${expectedActionId}`);
        expect(errorLoggerStub.args[0][0]).to.equal('Action action_id has failed with error "BOOM!"');
        expect(errorActionStub.called).to.be.true;
        expect(updateActionStub.called).to.be.true;
        expect(errorActionStub.args[0][0]).to.equal(expectedActionId);
      });
  }).timeout(4000);

  it('Given processing an action, ' +
    'When the action ID is valid, ' +
    'And process action resolves ' +
    'Then complete out the ChannelApe Action', () => {
    const expectedActionId = 'action_id';
    const request = { body: { actionId: expectedActionId } };
    const req = mockReq(request);
    const res = mockRes();
    const successController = new GenericControllerThatResolves();
    return successController.handle(req, res)
      .then(() => {
        expect(clearIntervalSpy.calledOnce).to.be.true;
        expect(infoLoggerStub.args[0][0]).to.equal(`Updating healthcheck for action ${expectedActionId}`);
        expect(errorLoggerStub.args.length).to.equal(0);
        expect(errorActionStub.called).to.be.false;
        expect(updateActionStub.called).to.be.true;
        expect(completeActionStub.calledOnce).to.be.true;
        expect(completeActionStub.args[0][0]).to.equal(expectedActionId);
      });
  }).timeout(4000);

  it('Given processing an action, ' +
    'When the action ID is valid, ' +
    'And process action is called several times before the action resolves ' +
    'Then complete the ChannelApe Action' +
    'And expect the healthcheck interval to end', async () => {
    const expectedActionId = 'action_id';
    const request = { body: { actionId: expectedActionId } };
    const req1 = mockReq(request);
    const res1 = mockRes();
    const req2 = mockReq(request);
    const res2 = mockRes();
    const req3 = mockReq(request);
    const res3 = mockRes();
    const successController = new GenericControllerThatResolves();
    const p1 = successController.handle(req1, res1);
    await timeout(20);
    const p2 = successController.handle(req2, res2);
    await timeout(20);
    const p3 = successController.handle(req3, res3);
    await timeout(20);

    return Q.all([p1, p2, p3])
      .then(async (results) => {
        await timeout(1000);
        expect(clearIntervalSpy.callCount).to.be
          .greaterThan(1, 'Clear Interval on Action Complete Interval should be called');
      });
  });
});
