import ErrorReportModule from './ErrorReportModule';

export default interface ErrorReport {
  module: ErrorReportModule;
  channelOrderId?: string;
  poNumber?: string;
  channelApeOrderId?: string;
  message: string;
}
