import { expect } from 'chai';

import AdditionalFieldService from '../../../src/channelape/service/AdditionalFieldService';

describe('AdditionalFieldService', () => {
  const additionalFields = [{ name: 'test', value: 'test_value' }];
  const undefinedObj = undefined;

  it('Given retrieving an additionalField value, ' +
    'When the additionalField exists, ' +
    'Then it returns the value', () => {
    const value = AdditionalFieldService.getValue(additionalFields, 'test');
    expect(value).to.equal('test_value');
  });

  it('Given retrieving an additionalField value, ' +
    'When the additionalField does not exist, ' +
    'Then it returns a blank string', () => {
    const value = AdditionalFieldService.getValue(additionalFields, 'your_not_real_man');
    expect(value).to.equal('');
  });

  it('Given retrieving an additionalField value, ' +
    'When the additionalField object is undefined, ' +
    'Then it returns a blank string', () => {
    const value = AdditionalFieldService.getValue(undefinedObj, 'test');
    expect(value).to.equal('');
  });
});
