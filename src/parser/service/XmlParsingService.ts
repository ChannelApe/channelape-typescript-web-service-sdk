import { parseString } from 'xml2js';
import { fork } from 'child_process';
import * as path from 'path';

import JsonToXmlSubprocessResponse from '../model/JsonToXmlSubprocessResponse';
import JsonToXmlSubprocessState from '../model/JsonToXmlSubprocessState';

const SUBPROCESS_MESSAGE_EVENT = 'message';

export default class XmlParsingService {
  private static subpath = path.join(__dirname, '../../../dist/parser/subprocess/JsonToXmlSubprocess.js');
  private static jsonToXmlSubprocess = fork(XmlParsingService.subpath);
  public static toXml(obj: any): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      // TODO: do we need to handle the busy state of the process or just let it block and return when available?
      // in theory this should be fine to just block because its a promise so it will resolve when it can.
      // will the static nature of this class be an issue? i doubt it.
      this.jsonToXmlSubprocess.on(SUBPROCESS_MESSAGE_EVENT, (messageEvent: JsonToXmlSubprocessResponse) => {
        if (messageEvent.state === JsonToXmlSubprocessState.FULFILLED) {
          return resolve(messageEvent.message);
        }
        return reject(messageEvent.message);
      });
      this.jsonToXmlSubprocess.send(obj);
    });
  }

  public static fromXml<T>(xml: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      parseString(xml, (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result);
      });
    });
  }
} // 0.2.0-develop.0
process.stdin.resume();
