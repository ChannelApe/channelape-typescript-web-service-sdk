import { AdditionalField } from 'channelape-sdk';

export default class AdditionalFieldService {
  public static getValue(additionalFields: AdditionalField[] | undefined, key: string): string {
    if (additionalFields === undefined) {
      return '';
    }
    const additionalField = additionalFields.find((additionalField) => {
      return additionalField.name === key;
    });
    if (additionalField === undefined) {
      return '';
    }
    return additionalField.value.toString();
  }
}
