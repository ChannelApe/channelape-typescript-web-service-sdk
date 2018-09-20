import { Readable, Writable } from 'stream';
import { Transform } from 'json2csv';

export default class CsvParsingService {
  public static toCsv(csvStrings: string[], fields: string[]): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      let csvString = '';
      const input = new Readable({ });
      input.push(`[${csvStrings.join()}]`);
      input.push(null);
      const output = new Writable({
        write: (chunk, encoding, next) => {
          csvString += chunk;
          next();
        }
      });
      const csvOptions = { fields };
      const streamOptions = { highWaterMark: 16384, encoding: 'utf-8' };
      const json2csv = new Transform(csvOptions, streamOptions);
      input.pipe(json2csv).pipe(output);
      json2csv
        .on('end', () => resolve(csvString))
        .on('error', err => reject(err));
    });
  }
}
