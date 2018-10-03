import { Readable, Writable } from 'stream';
import { Transform } from 'json2csv';
import * as csvParser from 'csv-parse';

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

  public static fromCsv<T>(csv: string): Promise<T[]> {
    return new Promise<T[]>((resolve, reject) => {
      csvParser(csv, {
        columns: true
      },
        (err, records) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(records);
        });
    });
  }
}
