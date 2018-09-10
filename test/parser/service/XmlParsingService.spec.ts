import { expect } from 'chai';
import * as fs from 'fs';
import * as AppRootPath from 'app-root-path';

import XmlParsingService from '../../../src/parser/service/XmlParsingService';
import TestInterface from '../../resources/service/parser/service/TestInterface';

const validXml =
  fs.readFileSync(`${AppRootPath}/test/resources/service/parser/service/validXml.xml`, 'utf-8');

describe('XmlParsingService', () => {

  describe('toXml', () => {
    const validObj = {
      xmlRoot: {
        propOne: 'propOne',
        propTwo: 'propTwo',
        propThree: {
          $: { attrOne: 'attrOne', attrTwo: 'attrTwo' },
          propFour: 'propFour',
          myArray: ['one', 'two', 'three', 'four']
        }
      }
    };
    const expectedXml = `<xmlRoot>
  <propOne>propOne</propOne>
  <propTwo>propTwo</propTwo>
  <propThree attrOne="attrOne" attrTwo="attrTwo">
    <propFour>propFour</propFour>
    <myArray>one</myArray>
    <myArray>two</myArray>
    <myArray>three</myArray>
    <myArray>four</myArray>
  </propThree>
</xmlRoot>`;
    const nullObj = null;

    it('Given an object, ' +
      'When the object is converted to XML, ' +
      'Then it will return the XML in a promise', () => {
      return XmlParsingService.toXml(validObj)
        .then((xml) => {
          expect(xml).to.equal(expectedXml);
        });
    });

    it('Given an object, ' +
      'When the object is null, ' +
      'Then it will reject with an error', () => {
      return XmlParsingService.toXml(nullObj)
        .then(() => {
          throw new Error('test failed');
        })
        .catch((err) => {
          expect(err).to.equal('Cannot convert undefined or null to object');
        });
    });

    it('Given parsing XML synchronously, ' +
      'When JSON is converted to XML, ' +
      'Then it will return in a callback', (done) => {
      XmlParsingService.toXmlSync(validObj, (err, xml) => {
        expect(err).to.be.undefined;
        expect(xml).to.equal(expectedXml);
        done();
      });
    });

    it('Given parsing XML synchronously, ' +
      'When the object is null, ' +
      'Then it will return an error in the callback', (done) => {
      XmlParsingService.toXmlSync(nullObj, (err, xml) => {
        expect(xml).to.be.undefined;
        expect(err).to.equal('Cannot convert undefined or null to object');
        done();
      });
    });
  });

  describe('fromXml', () => {
    it('Given a valid xml string, ' +
      'When the object is converted to XML, ' +
      'Then it will return an object in a promise', () => {
      return XmlParsingService.fromXml<TestInterface>(validXml)
        .then((object) => {
          expect(object.CHANNELAPE_ACK.HEAD[0].ACK[0].Status[0]).to.equal('Success');
        });
    });

    it('Given an invalid xml string, ' +
      'Then it will reject a promise', () => {
      return XmlParsingService.fromXml<TestInterface>('invalid xml')
        .then(() => {
          throw new Error('fromXml should have failed');
        })
        .catch((e) => {
          expect(e.message).to.equal('Non-whitespace before first tag.\nLine: 0\nColumn: 1\nChar: i');
        });
    });
  });
});
