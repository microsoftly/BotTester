import { IMessage } from 'botbuilder';
import { ExpectedMessage } from './ExpectedMessage';

/**
 * Manages the comparisons against expected messages and outgoingMessages that the BotTester framework intercepts
 */
export class OutgoingMessageComparator {
    private readonly expectedMessages: ExpectedMessage[];

    constructor(expectedMessages: ExpectedMessage[]) {
        this.expectedMessages = expectedMessages;
    }

    /**
     * compares the current outgoing message against the current expected message
     */
    public compareOutgoingMessageToExpectedResponses(outgoingMessage: IMessage): void {
        const nextMessage = this.dequeueNextExpectedMessage();

        if (nextMessage) {
            nextMessage.checkForMessageMatch(outgoingMessage);
        }
    }

    /**
     * returns tfalse when all expected messages have been seen (e.g. test steps are emtpy)
     */
    public expectsAdditionalMessages(): boolean {
        return this.expectedMessages.length !== 0;
    }

    public getTimeoutErrorMessage(): string {
        return `timedout while waiting to receive ${this.expectedMessages[0].toString()}`;
    }

    /**
     * gets the next expected message and removes it from the expectedMessages
     */
    private dequeueNextExpectedMessage(): ExpectedMessage {
        return this.expectedMessages.shift();
    }
}
