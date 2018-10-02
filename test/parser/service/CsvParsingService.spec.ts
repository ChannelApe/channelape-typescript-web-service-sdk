import { expect } from 'chai';
import * as eol from 'eol';

import { Parser } from '../../../src/';

describe('CSV Parsing Service', () => {
  /* tslint:disable max-line-length */
  const inputRows = [
    '{"module":"Order","channelOrderId":"111","poNumber":"ABUK111","channelApeOrder":"https://app.channelape.com/orders/111","message":"Order is missing the first thing"}',
    '{"module":"Order","channelOrderId":"222","poNumber":"ABUK222","channelApeOrder":"https://app.channelape.com/orders/222","message":"Order is missing the second thing"}',
    '{"module":"Order","channelOrderId":"333","poNumber":"ABUK333","channelApeOrder":"https://app.channelape.com/orders/333","message":"Order is missing the third thing"}'
  ];
  /* tsline:enable max-line-length */
  const inputFields = ['module', 'channelOrderId', 'poNumber', 'channelApeOrder', 'message'];
  const expectedCsv = '"module","channelOrderId","poNumber","channelApeOrder","message"\n' +
    '"Order","111","ABUK111","https://app.channelape.com/orders/111","Order is missing the first thing"\n' +
    '"Order","222","ABUK222","https://app.channelape.com/orders/222","Order is missing the second thing"\n' +
    '"Order","333","ABUK333","https://app.channelape.com/orders/333","Order is missing the third thing"';

  it('Given parsing strings into a CSV document, ' +
    'When the CSV finishes parsing, ' +
    'Then it will resolve with the CSV string', () => {
    return Parser.Csv.toCsv(inputRows, inputFields)
      .then((csv) => {
        expect(eol.auto(csv)).to.equal(eol.auto(expectedCsv));
      });
  });

  it('Given parsing strings into a CSV document, ' +
    'When the CSV fails to parse, ' +
    'Then it will reject with the error', () => {
    return Parser.Csv.toCsv(['youlikecrabbypattiesdontyousquidward'], inputFields)
      .then(() => {
        throw new Error('test failed');
      })
      .catch((err) => {
        expect(err.message).to.equal('Invalid JSON (Unexpected "y" at position 1 in state STOP)');
      });
  });
});
