import { expect } from 'chai';

import * as Parser from '../../src/parser/Parser';

describe('Parser', () => {
  it('Should export XML as a getter with XmlParsingService as the return value', () => {
    expect(Parser.XML.toXml).to.be.a('function');
    expect(Parser.XML.fromXml).to.be.a('function');
  });
});
