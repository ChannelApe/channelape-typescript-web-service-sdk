import * as dotenv from 'dotenv';

export default class Secrets {
  public static env: { [key: string]: string; } = {
    CHANNEL_APE_SECRET_KEY: '',
    CHANNEL_APE_OPEN_ORDERS_RETRIEVAL_DELAY_MINUTES: '',
    CHANNEL_APE_API_DOMAIN_NAME: '',
    CHANNEL_APE_OPEN_ORDERS_DATE: '',
    RSSBUS_SECRET: '',
    RSSBUS_ENDPOINT: '',
    PORT: '3000',
    CHANNEL_APE_OPEN_ORDERS_START_DATE_INTERVAL_DAYS: '7',
    LOG_LEVEL: 'info'
  };

  public static validateEnvars() {
    Object.keys(Secrets.env).forEach((variableKey) => {
      if (Secrets.env[variableKey] === '') {
        throw new Error(`missing envar ${variableKey}`);
      }
    });
  }

  public static initialize(): void {
    dotenv.config();
    Secrets.setEnvars();
  }

  private static setEnvars(): void {
    Object.keys(Secrets.env).forEach((variableKey) => {
      const variableValue = process.env[variableKey];
      if (typeof variableValue === 'string' && variableValue !== '') {
        Secrets.env[variableKey] = variableValue;
      }
    });
  }
}

Secrets.initialize();
