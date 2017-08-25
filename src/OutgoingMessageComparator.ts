import { IMessage } from 'botbuilder';
import { ExpectedMessage } from './ExpectedMessage';

export class OutgoingMessageComparator {
    private readonly expectedMessages: ExpectedMessage[];

    constructor(expectedMessages: ExpectedMessage[]) {
        this.expectedMessages = expectedMessages;
    }

    public compareOutgoingMessageToExpectedResponses(outgoingMessage: IMessage): void {
        const nextMessage = this.getNextExpectedMessage();

        if (nextMessage) {
            nextMessage.checkForMessageMatch(outgoingMessage);
        }
    }

    public expectsAdditionalMessages(): boolean {
        return this.expectedMessages.length !== 0;
    }

    private getNextExpectedMessage(): ExpectedMessage {
        return this.expectedMessages.shift();
    }
}
