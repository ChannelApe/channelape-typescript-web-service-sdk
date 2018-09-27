export default interface SendMailRequest {
  recipientsCsv: string;
  from: string;
  subject: string;
  body: string;
  attachments?: { fileContent: string; fileName: string; }[];
}
