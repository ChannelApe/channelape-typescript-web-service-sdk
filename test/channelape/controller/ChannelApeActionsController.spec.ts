import * as sinon from 'sinon';
import { ChannelApeClient, Environment } from 'channelape-sdk';
import { expect } from 'chai';
import { mockReq, mockRes } from 'sinon-express-mock';
import { Logger } from 'channelape-logger';
import * as Q from 'q';

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
    }, 150);
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

  beforeEach(() => {
    Secrets.env.LOG_LEVEL = 'info';
    sandbox = sinon.createSandbox();
    updateActionStub = sandbox.stub().resolves({ healthCheckIntervalInSeconds: 0.001 });
    completeActionStub = sandbox.stub().resolves();
    errorActionStub = sandbox.stub().resolves();
    sandbox.stub(ChannelApeClient.prototype, 'actions').returns({
      updateHealthCheck: updateActionStub,
      complete: completeActionStub,
      error: errorActionStub
    });

    infoLoggerStub = sandbox.stub(Logger.prototype, 'info');
    errorLoggerStub = sandbox.stub(Logger.prototype, 'error');
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
        expect(infoLoggerStub.args[0][0]).to.equal(`Updating healthcheck for action ${expectedActionId}`);
        expect(errorLoggerStub.args.length).to.equal(0);
        expect(errorActionStub.called).to.be.false;
        expect(updateActionStub.called).to.be.true;
        expect(completeActionStub.calledOnce).to.be.true;
        expect(completeActionStub.args[0][0]).to.equal(expectedActionId);
      });
  }).timeout(4000);
});
