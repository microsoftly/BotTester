import { IMessage, Message } from 'botbuilder';

export interface ITestMessage extends IMessage {
  regexp?: RegExp;
}

export class TestMessage extends Message {
  protected data = <ITestMessage>{};

  public regexp(regexp: RegExp): this {
    this.data.regexp = regexp;

    return this;
  }
}
