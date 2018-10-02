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

  it('Given parsing a CSV document, ' +
    'Then it will return an object of type T', () => {
    const csv =
`orderId,customerId,sku,price
o1,c1,s1,11.11
o2,c2,s2,22.22
o3,c3,s3,33.33`;

    interface objectType {
      orderId: string;
      customerId: string;
      sku: string;
      price: string;
    }

    return Parser.Csv.fromCsv<objectType>(csv)
      .then((objects) => {
        expect(objects.length).to.equal(3, 'There should be three objects in the array parsed from the CSV string');

        expect(objects[0].orderId).to.equal('o1');
        expect(objects[0].customerId).to.equal('c1');
        expect(objects[0].sku).to.equal('s1');
        expect(objects[0].price).to.equal('11.11');

        expect(objects[1].orderId).to.equal('o2');
        expect(objects[1].customerId).to.equal('c2');
        expect(objects[1].sku).to.equal('s2');
        expect(objects[1].price).to.equal('22.22');

        expect(objects[2].orderId).to.equal('o3');
        expect(objects[2].customerId).to.equal('c3');
        expect(objects[2].sku).to.equal('s3');
        expect(objects[2].price).to.equal('33.33');
      });
  });

  it('Given parsing a CSV document, ' +
    'When the CSV fails to parse, ' +
    'Then it will return a rejected promise', () => {
    const csv = 1701;

    interface objectType {
      orderId: string;
      customerId: string;
      sku: string;
      price: string;
    }

    return Parser.Csv.fromCsv<objectType>(csv as any)
      .then((objects) => {
        throw new Error('Should not have parsed!');
      })
      .catch((e) => {
        expect(e.message).to.equal('Invalid data argument: 1701');
      });
  });
});
