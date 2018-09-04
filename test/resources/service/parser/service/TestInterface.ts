export default interface TestInterface {
  CHANNELAPE_ACK: {
    HEAD: {
      Message_Id: string;
      Date_Time: string;
      Message_Type: string;
      Sender_Id: string;
      Recipient_Id: string;
      ACK: {
        Reference_Id: string;
        Dstamp: string;
        Status: string[0];
      }[];
    }[];
  };
}
