import * as zlib from 'zlib';

export default class DecompressionService {
  public static decompress(value: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const decompressedBuffer = Buffer.from(value, 'base64');
      zlib.unzip(decompressedBuffer, (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        const decompressedValue = result.toString();
        resolve(decompressedValue);
      });
    });
  }
}
