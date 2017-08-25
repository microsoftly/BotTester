import { IMessage } from 'botbuilder';
import { ExpectedMessage } from './ExpectedMessage';

export class OutgoingMessageComparator {
    private readonly expectedMessages: ExpectedMessage[];

    constructor(expectedMessages: ExpectedMessage[]) {
        this.expectedMessages = expectedMessages;
    }

    /**
     * compares the outgoing message against the expected message. The type of check performed is dependent on the expected message type
     */
    public compareOutgoingMessageToExpectedResponses(outgoingMessage: IMessage): void {
        const nextMessage = this.getNextExpectedMessage();

        if (nextMessage) {
            nextMessage.checkForMessageMatch(outgoingMessage);
        }
    }

    /**
     * @returns true if the test expects more messages, false otherwise
     */
    public expectsAdditionalMessages(): boolean {
        return this.expectedMessages.length !== 0;
    }

    private getNextExpectedMessage(): ExpectedMessage {
        return this.expectedMessages.shift();
    }
}
