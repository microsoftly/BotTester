import { IMessage } from 'botbuilder';
import { ExpectedMessage } from './ExpectedMessage';

/**
 * Manages the comparisons against expected messages and outgoingMessages that the BotTester framework intercepts
 */
export class OutgoingMessageComparator {
    private expectedMessages: ExpectedMessage[];
    private readonly ignoreOrder: boolean;

    constructor(expectedMessages: ExpectedMessage[], ignoreOrder: boolean) {
        this.expectedMessages = expectedMessages;
        this.ignoreOrder = ignoreOrder;
    }

    /**
     * compares the current outgoing message against the current expected message
     */
    public compareOutgoingMessageToExpectedResponses(outgoingMessage: IMessage): void {
        if (this.ignoreOrder) {
            this.compareOutgoingMessageToExpectedResponsesWithoutOrder(outgoingMessage);
        } else {
            this.compareOutgoingMessageToExpectedResponsesInOrder(outgoingMessage);
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

    private compareOutgoingMessageToExpectedResponsesInOrder(outgoingMessage: IMessage): void {
        const nextMessage = this.dequeueNextExpectedMessage();

        if (nextMessage) {
            nextMessage.checkForMessageMatch(outgoingMessage);
        }
    }

    private compareOutgoingMessageToExpectedResponsesWithoutOrder(outgoingMessage: IMessage): void {
        const originalItemCount = this.expectedMessages.length;

        let matchingMessageFound: boolean = false;
        this.expectedMessages = this.expectedMessages.filter((expectedMessage: ExpectedMessage, i: number) => {
            if (matchingMessageFound) {
                return true;
            }

            try {
                expectedMessage.checkForMessageMatch(outgoingMessage);

                matchingMessageFound = true;

                return false;
            } catch (e) {
                return true;
            }
        });

        if (originalItemCount === this.expectedMessages.length) {
            throw new Error(`${JSON.stringify(outgoingMessage, null, 2)} did not match any of ${this.expectedMessages.map((t: ExpectedMessage) => t.toString())}`);
        }
    }

    /**
     * gets the next expected message and removes it from the expectedMessages
     */
    private dequeueNextExpectedMessage(): ExpectedMessage {
        return this.expectedMessages.shift();
    }
}
