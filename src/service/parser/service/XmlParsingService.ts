import { Builder, parseString } from 'xml2js';
import * as Q from 'q';

export default class XmlParsingService {
  private static readonly xmlBuilder = new Builder({ headless: true });

  public static toXml(obj: any): Q.Promise<string> {
    const deferred = Q.defer<string>();
    try {
      deferred.resolve(this.xmlBuilder.buildObject(obj));
    } catch (err) {
      deferred.reject(err.message);
    }
    deferred.resolve();
    return deferred.promise;
  }

  public static fromXml<T>(xml: string): Q.Promise<T> {
    const deferred = Q.defer<T>();
    parseString(xml, (err, result) => {
      if (err) {
        return deferred.reject(err);
      }
      deferred.resolve(result);
    });
    return deferred.promise;
  }
}
