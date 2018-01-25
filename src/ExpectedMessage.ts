import { IEvent, IMessage } from 'botbuilder';
import { expect } from './assertionLibraries/IExpectation';

export enum ExpectedMessageType {
    String,
    IMessage,
    Regex
}

/**
 * Types accepted for responses checkers
 */
export type PossibleExpectedMessageType = string | IMessage | RegExp | IEvent;

/**
 * Response expectations area always collections. The collection is the set of possible responses, chosen at random. If the collection size
 * is 1, then there is only one response that is expected
 */
export type PossibleExpectedMessageCollections = PossibleExpectedMessageType[];

function getExpectedMessageType(expectedResponseCollection: PossibleExpectedMessageCollections): ExpectedMessageType {
    const firstElt = expectedResponseCollection[0];

    if (typeof firstElt === 'string') {
        return ExpectedMessageType.String;
    } else if (firstElt.constructor.name === 'RegExp') {
        return ExpectedMessageType.Regex;
    } else {
        return ExpectedMessageType.IMessage;
    }
}

/**
 * Class that wraps expectedResponseCollections for comparison against an outgoing message. One instance of ExpectedMessage represents one
 * response from the bot.
 */
export class ExpectedMessage {
    /**
     * set of possible responses, chosen at random. If the collection size is 1, then there is only one response that is expected
     */
    private readonly expectedResponseCollection: PossibleExpectedMessageCollections;

    constructor(expectedResponseCollection: PossibleExpectedMessageType | PossibleExpectedMessageCollections) {
        if (!(expectedResponseCollection instanceof Array)) {
            this.expectedResponseCollection = [expectedResponseCollection as PossibleExpectedMessageType];
        } else {
            this.expectedResponseCollection = expectedResponseCollection as PossibleExpectedMessageCollections;
        }

        expect(this.expectedResponseCollection, 'expected response collections cannot be empty').notToBeEmpty();
    }

    /**
     * routes the outgoingMessage to the proper comparison method based on the expectedResponseCollection. This switch based method exists
     * due to typescript's lack of polymorphism support.
     *
     * @param outgoingMessage outgoing message that is being compared
     */
    public checkForMessageMatch(outgoingMessage: IMessage): void {
        switch (getExpectedMessageType(this.expectedResponseCollection)) {
            case ExpectedMessageType.String:
                this.checkMessageTextForExactStringMatch(outgoingMessage, this.expectedResponseCollection as string[]);
                break;
            case ExpectedMessageType.Regex:
                this.checkMessageTextForRegex(outgoingMessage);
                break;
            case ExpectedMessageType.IMessage:
                // doing this check will highlight if the diff in text instead of a large IMessage diff
                this.deepMessageMatchCheck(outgoingMessage);
                break;
            default:
                expect(outgoingMessage.type).toEqual('save');
        }
    }

    public toString(): string {
        return JSON.stringify(this.expectedResponseCollection, null, 2);
    }

    /**
     * Asserts that outgoingMessage.text is within the expectedResponseStrings collection
     *
     * @param outgoingMessage outgoing message being compared
     * @param expectedResponseStrings collection of possible string values for comparison
     */
    private checkMessageTextForExactStringMatch(outgoingMessage: IMessage, expectedResponseStrings: string[]): void {
        const outgoingText = outgoingMessage.text;

        const errorStringExpectedResponseText =
            expectedResponseStrings.length > 1 ? `one of ${expectedResponseStrings}` : expectedResponseStrings[0];

        const errorString =
            `Bot should have responded with '${errorStringExpectedResponseText}', but was '${outgoingText}'`;

        expect(expectedResponseStrings, errorString).toInclude(outgoingText);
    }

    /**
     * Assumes the expectedResponseCollection are regexs. Asserts that outgoingMessage.text matches at least of the regexs in
     * expectedResponseCollection
     *
     * @param outgoingMessage outgoing message being compared
     */
    private checkMessageTextForRegex(outgoingMessage: IMessage): void {
        const text = outgoingMessage.text;
        const regexCollection: RegExp[] = this.expectedResponseCollection as RegExp[];
        expect(regexCollection.some((regex: RegExp) => regex.test(text)),
               `'${text}' did not match any regex in ${regexCollection}`).toBeTrue();
    }

    /**
     * Assumes the expectedResponseCollection is an IMessage[]. Asserts that at least one IMessage in expectedResponseCollection is fully
     * contained within the outgoingMessage (i.e. the outgoingMessage  {type: 'message', text:'hello'}) would be matched successfully
     * against {type: 'message', text: 'hello', user: { id: user1 }} because the outgoing message is contained within the response. It would
     * not successfulyl be matched against {text: 'hello', user: { id: user1 }} because the expected response is missing { type: 'message' }
     * @param outgoingMessage outgoing message being compared
     */
    private deepMessageMatchCheck(outgoingMessage: IMessage): void {
        const expectedResponseCollectionAsIMessage = this.expectedResponseCollection as IMessage[];
        const expectedResponseStrings =
            // get all possible responses as strings. It is possible that the expected responses have no text, so filter out those values
            expectedResponseCollectionAsIMessage
                .map((expectedResponse: IMessage) => expectedResponse.text)
                .filter((text: string) => text);

        if (expectedResponseStrings.length) {
            // doing this check will highlight if the diff in text instead of a large IMessage diff
            this.checkMessageTextForExactStringMatch(outgoingMessage, expectedResponseStrings);
        }

        expect(expectedResponseCollectionAsIMessage).toDeeplyInclude(outgoingMessage);
    }
}
