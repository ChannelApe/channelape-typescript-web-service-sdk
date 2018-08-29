import { expect } from 'chai';
import * as dotenv from 'dotenv';
import * as sinon from 'sinon';
import Secrets from '../../../src/environment/model/Secrets';

describe('Secrets', () => {
  let sandbox: sinon.SinonSandbox;
  let validateSpy: sinon.SinonSpy;
  let dotenvSpy: sinon.SinonSpy;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    validateSpy = sandbox.spy(Secrets, 'validateEnvars');
    dotenvSpy = sandbox.spy(dotenv, 'config');
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('Given starting the application, ' +
    'When there are environment variables available, ' +
    'Then they will get ingested by the service', () => {
    process.env.TEST1 = 'test one';
    process.env.TEST2 = 'test two';
    Secrets.env = {
      TEST1: '',
      TEST2: '',
    };
    Secrets.initialize();

    expect(dotenvSpy.calledOnce).to.be.true;
    expect(Secrets.env.TEST1).to.equal('test one');
    expect(Secrets.env.TEST2).to.equal('test two');
  });

  it('Given starting the application, ' +
    'When an environment variable is missing, ' +
    'An error will be thrown', () => {
    process.env.TEST3 = 'test one';
    process.env.TEST4 = 'test two';
    Secrets.env = {
      TEST3: '',
      TEST5: '',
    };
    Secrets.initialize();

    try {
      validateSpy();
    } catch (e) {
      expect(e).not.to.be.undefined;
      expect(validateSpy.threw()).to.be.true;
    }
  });
});
