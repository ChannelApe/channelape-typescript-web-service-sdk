import { Builder } from 'xml2js';

import JsonToXmlSubprocessResponse from '../model/JsonToXmlSubprocessResponse';
import JsonToXmlSubprocessState from '../model/JsonToXmlSubprocessState';

const SUBPROCESS_MESSAGE_EVENT = 'message';
const xmlBuilder = new Builder({ headless: true });

process.on(SUBPROCESS_MESSAGE_EVENT, (msg: any) => {
  console.log('receiving a message', process.uptime());
  JsonToXmlSubprocess.parse(msg);
});

class JsonToXmlSubprocess {
  public static parse(obj: any): void {
    try {
      console.log('processing a message', process.uptime());
      const xml = xmlBuilder.buildObject(obj);
      this.sendResponse({ state: JsonToXmlSubprocessState.FULFILLED, message: xml });
    } catch (err) {
      this.sendResponse({ state: JsonToXmlSubprocessState.REJECTED, message: err.message });
    }
  }

  private static sendResponse(response: JsonToXmlSubprocessResponse): void {
    if (process.send === undefined) {
      throw new Error('process.send is undefined; JsonToXmlSubprocess cannot talk to parent process.');
    }
    process.send(response);
  }
}
