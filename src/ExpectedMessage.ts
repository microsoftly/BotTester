import { IMessage } from 'botbuilder';
import * as chai from 'chai';
import * as chaiSamSam from 'chai-samsam';

chai.use(chaiSamSam);
type DeepMatchReturn = { to: {
    deep: {
        match(arg: {}): {}
    }
}};
type DeepMatch = (args: {}, errMsg?: string) => DeepMatchReturn;

const expect = chai.expect;

//tslint:disable
const expectWithDeepMatch: DeepMatch = expect as any;
//tslint:enable
export enum ExpectedMessageType {
    String,
    IMessage,
    Regex,
    save
}

export type PossibleExpectedMessageType = string | IMessage | RegExp;
export type PossibleExpectedMessageCollections = PossibleExpectedMessageType[];

function getExpectedMessageType(expectedResponseCollection: PossibleExpectedMessageCollections): ExpectedMessageType {
    const firstElt = expectedResponseCollection[0];
    if (firstElt === undefined) {
        return ExpectedMessageType.save;
    }

    if (typeof firstElt === 'string') {
        return ExpectedMessageType.String;
    } else if (firstElt.constructor.name === 'RegExp') {
        return ExpectedMessageType.Regex;
    } else {
        return ExpectedMessageType.IMessage;
    }
}

export class ExpectedMessage {
    // if length > 1, random response
    private readonly expectedResponseCollection: PossibleExpectedMessageCollections;

    constructor(expectedResponseCollection: PossibleExpectedMessageType | PossibleExpectedMessageCollections) {
        if (!(expectedResponseCollection instanceof Array)) {
            this.expectedResponseCollection = [expectedResponseCollection as PossibleExpectedMessageType];
        } else {
            this.expectedResponseCollection = expectedResponseCollection as PossibleExpectedMessageCollections;
        }

        expect(this.expectedResponseCollection, 'expected response collections cannot be empty').not.to.be.empty;
    }

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
                expect(outgoingMessage.type).to.equal('save');

        }
    }

    private checkMessageTextForExactStringMatch(outgoingMessage: IMessage, expectedResponseStrings: string[]): void {
        const outgoingText = outgoingMessage.text;

        const errorStringExpectedResponseText =
            expectedResponseStrings.length > 1 ? `one of ${expectedResponseStrings}` : expectedResponseStrings[0];

        const errorString =
            `Bot should have responded with '${errorStringExpectedResponseText}', but was '${outgoingText}`;

        expect(expectedResponseStrings, errorString).to.include(outgoingText);
    }

    private checkMessageTextForRegex(outgoingMessage: IMessage): void {
        const text = outgoingMessage.text;
        const regexCollection: RegExp[] = this.expectedResponseCollection as RegExp[];
        expect(regexCollection.some((regex: RegExp) => regex.test(text)),
               `${text} did not match any regex in ${regexCollection}`).to.be.true;
    }

    // add on additional checks here (e.g. address match, attachment match, etc ...)
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

        let matchExists: boolean = false;

        expectedResponseCollectionAsIMessage.forEach((expectedResponse: IMessage) => {
            if (matchExists) {
                return;
            }

            const clone = Object.assign({}, outgoingMessage);

            // ignore source event (not added to message until after sending)
            delete expectedResponse.source;

            // auto added by prompts, not needed
            delete outgoingMessage.inputHint;

            // always botbuilder
            delete expectedResponse.agent;

            try {
                expectWithDeepMatch(clone).to.deep.match(expectedResponse);
                matchExists = true;
            } catch (e) {
                // continue
            }
        });
    }
}
