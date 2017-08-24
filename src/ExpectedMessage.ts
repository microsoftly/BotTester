import { IMessage } from 'botbuilder';
import { expect } from 'chai';

export enum ExpectedMessageType {
    String,
    IMessage,
    Regex
}

type PossibleExpectedMessageCollections = string[] | IMessage[] | RegExp[];

function getExpectedMessageType(expectedResponseCollection: PossibleExpectedMessageCollections): ExpectedMessageType {

}

export class ExpectedMessage {
    // if length > 1, random response
    private readonly expectedResponseCollection: PossibleExpectedMessageCollections;

    constructor(expectedResponseCollection: PossibleExpectedMessageCollections) {
        expect(expectedResponseCollection, 'expected response collections cannot be empty').not.to.be.empty;

        this.expectedResponseCollection = expectedResponseCollection;
    }

    public checkForMessageMatch(outgoingMessage: IMessage): void {
        switch (getExpectedMessageType(this.expectedResponseCollection)) {
            case ExpectedMessageType.String:
                this.checkMessageTextForExactStringMatch(outgoingMessage);
                break;
            case ExpectedMessageType.Regex:
                this.checkMessageTextForRegex(outgoingMessage);
                break;
            case ExpectedMessageType.IMessage:
                // doing this check will highlight if the diff in text instead of a large IMessage diff
                this.checkMessageTextForExactStringMatch(outgoingMessage);
                this.deepMessageMatchCheck(outgoingMessage);
            default:
        }
    }

    private checkMessageTextForExactStringMatch(outgoingMessage: IMessage): void {
    }

    private checkMessageTextForRegex(outgoingMessage: IMessage): void {

    }

    // add on additional checks here (e.g. address match, attachment match, etc ...)
    private deepMessageMatchCheck(outgoingMessage: IMessage): void {

    }
}
