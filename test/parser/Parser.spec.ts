import { expect } from 'chai';

import * as Parser from '../../src/parser/Parser';

describe('Parser', () => {
  it('Should export Xml as a getter with XmlParsingService as the return value', () => {
    expect(Parser.Xml.toXml).to.be.a('function');
    expect(Parser.Xml.fromXml).to.be.a('function');
    expect(Parser.Csv.toCsv).to.be.a('function');
  });
});
