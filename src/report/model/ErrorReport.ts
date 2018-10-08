import ErrorReportModule from './ErrorReportModule';

export default interface ErrorReport {
  module: ErrorReportModule;
  message: string;
  channelOrderId?: string;
  poNumber?: string;
  channelApeOrderId?: string;
  businessId?: string;
}
