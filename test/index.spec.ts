import { expect } from 'chai';
import * as WebServiceSdk from '../src/index';

describe('Index', () => {
  it('Expect Secrets to be exported', () => {
    expect(WebServiceSdk.Secrets).to.equal(WebServiceSdk.Secrets);
  });

});
