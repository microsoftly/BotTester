import {IEvent, IMessage} from 'botbuilder';
import {assert} from 'chai';
import {BotTesterExpectation} from './assertionLibraries/BotTesterExpectation';
import {IConfig} from './config';

export enum ExpectedMessageType {
    String,
    IMessage,
    Regex,
    Function
}

/**
 * Types accepted for responses checkers
 */
export type PossibleExpectedMessageType = string | IMessage | RegExp | IEvent | Function;

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
    } else if (firstElt.constructor.name === 'Function') {
        return ExpectedMessageType.Function;
    } else {
        return ExpectedMessageType.IMessage;
    }
}

/**
 * Class that wraps expectedResponseCollections for comparison against an outgoing message. One instance of ExpectedMessage represents one
 * response from the bot.
 */
export class ExpectedMessage {
    private readonly internalExpectation: BotTesterExpectation;
    /**
     * set of possible responses, chosen at random. If the collection size is 1, then there is only one response that is expected
     */
    private readonly expectedResponseCollection: PossibleExpectedMessageCollections;

    constructor(config: IConfig,
                expectedResponseCollection: PossibleExpectedMessageType | PossibleExpectedMessageCollections) {
        this.internalExpectation = new BotTesterExpectation(config);

        if (!(expectedResponseCollection instanceof Array)) {
            this.expectedResponseCollection = [expectedResponseCollection as PossibleExpectedMessageType];
        } else {
            this.expectedResponseCollection = expectedResponseCollection as PossibleExpectedMessageCollections;
        }
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
            case ExpectedMessageType.Function:
                this.deepMatchCheckWithFunction(outgoingMessage);
                break;
            default:
                this.internalExpectation.expect(outgoingMessage.type).toEqual('save');
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

        this.internalExpectation.expect(expectedResponseStrings, errorString).toInclude(outgoingText);
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

        this.internalExpectation.expect(regexCollection.some((regex: RegExp) => regex.test(text)),
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

        this.internalExpectation.expect(expectedResponseCollectionAsIMessage).toDeeplyInclude(outgoingMessage);
    }

    /**
     *  Verfy the incoming message with custom test defined by tester
     *  If the function that tester defined return an error, make the test break
     *  If the function return anything else, the test is considered as good
     *  I've tryed to use promise as parameter, but in a promise we change scope, so the assert doesn't work
     * @param {IMessage} outgoingMessage outgoing message being compared
     */
    private deepMatchCheckWithFunction(outgoingMessage: IMessage): void {
        const functionCollection: Function[] = this.expectedResponseCollection as Function[];
        let errorString = '';
        let success = false;
        functionCollection.forEach((func: Function) => {
            const result = func(outgoingMessage);
            if (result instanceof Error) {
                errorString += `\n -----------------ERROR-----------------\n\n\n'${result.message}' `;
            } else {
                success = true;
            }
        });
        // ErrorString here, can hold multiples error, if the bot send multiples message in one batching
        const error = `Bot should have relied response that matches with function but respond '${outgoingMessage}'` +
            ` that create the following error(s) '${errorString}'`;
        this.internalExpectation.expect(success, error).toBeTrue();

    }
}
