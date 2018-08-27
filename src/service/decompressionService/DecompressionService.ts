import * as zlib from 'zlib';
import * as Q from 'q';

export default class DecompressionService {
  public static decompress(value: string): Q.Promise<string> {
    const deferredRejectionMessage = Q.defer<string>();
    const decompressedBuffer = Buffer.from(value, 'base64');
    zlib.unzip(decompressedBuffer, (err, result) => {
      if (err) {
        deferredRejectionMessage.reject(err);
        return;
      }
      const decompressedValue = result.toString();
      deferredRejectionMessage.resolve(decompressedValue);
    });
    return deferredRejectionMessage.promise;
  }
}
