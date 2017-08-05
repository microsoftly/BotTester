import { IAddress, IIdentity, IMessage, Message } from 'botbuilder';
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

export function convertStringToMessage(text: string, address: IAddress): IMessage {
    return new Message()
        .text(text)
        .address(address)
        .toMessage();
}

export function convertStringArrayToMessageArray(texts: string[], address: IAddress): IMessage[] {
    return texts.map((text: string) => convertStringToMessage(text, address));
}

export function convertStringArrayTo2DMessageArray(texts: string[], address: IAddress): IMessage[][] {
    return texts.map((text: string) => convertStringArrayToMessageArray([text], address));
}

export function convert2DStringArrayTo2DMessageArray(collectionOfTexts: string[][], address: IAddress): IMessage[][] {
    return collectionOfTexts.map((texts: string[]) => convertStringArrayToMessageArray(texts, address));
}

export function is2DArray(o: {}): boolean {
    return o instanceof Array && (o as {}[]).length &&
        o[0] instanceof Array && (o[0] as {}[]).length &&
        !(o[0][0] instanceof Array);
}

export function compareMessageWithExpectedMessages(actualResponse: IMessage, expectedResponseCollection: IMessage[]): void {
    const expectedAddress = expectedResponseCollection[0].address;
    const expctedResponseStrings = expectedResponseCollection.map((r: IMessage) => r.text);

    const errorStringExpectedResponseText =
        expctedResponseStrings.length > 1 ? `one of ${expctedResponseStrings}` : expctedResponseStrings[0];
    let errorString: string =
        `Bot should have responded with '${errorStringExpectedResponseText}', but was '${actualResponse.text}`;

    if (errorStringExpectedResponseText) {
        expect(expctedResponseStrings, errorString).to.include(actualResponse.text);
    }

    let matchExists: boolean = false;

    expectedResponseCollection.forEach((expectedResponse: IMessage) => {
        if (matchExists) {
            return;
        }

        const clone = Object.assign({}, actualResponse);

        // ignore source event (not added to message until after sending)
        delete expectedResponse.source;

        // auto added by prompts, not needed
        delete actualResponse.inputHint;

        // always botbuilder
        delete expectedResponse.agent;

        try {
            expectWithDeepMatch(clone).to.deep.match(expectedResponse);
            matchExists = true;
        } catch (e) {
            // continue
        }
    });

    if (!matchExists) {
        const stringifiedActualResponse = JSON.stringify(actualResponse, null, 2);
        let stringifiedExpectedResponse: string;

        if (expectedResponseCollection.length === 1) {
            stringifiedExpectedResponse = JSON.stringify(expectedResponseCollection[0], null, 2);

            errorString = `${stringifiedActualResponse} was not a subset of expected response: ${stringifiedExpectedResponse}`;
        } else {
            stringifiedExpectedResponse = JSON.stringify(expectedResponseCollection, null, 2);

            errorString =
                `${stringifiedActualResponse} was not a subset of any message in expected responses: ${stringifiedExpectedResponse}`;
        }

        expect.fail(actualResponse, expectedResponseCollection, errorString);
    }
}

export function identityIsComposedOfOther(id: IIdentity, otherId: IIdentity) : boolean {
    return (!id.id || id.id === otherId.id) && (!id.name || id.name === otherId.name);
}

export function identityIsComposedOfOtherTest(id: IIdentity, otherId: IIdentity, field?: string) : void {
    const createErrorString = (thisVal: string, otherVal: string, idField: string) =>
        `${field && `${field}'s `}${idField} was expected to be ${otherVal} but was ${thisVal}`;

    if (id.id) {
        expect(id.id, createErrorString(id.id, otherId.id, 'id')).to.equal(otherId.id);
    }

    if (id.name) {
        expect(id.name, createErrorString(id.name, otherId.name, 'name')).to.equal(otherId.name);
    }
}

export function addressIsComposedOfOther(inspectedAddress: IAddress, otherAddress: IAddress): boolean {
    // if field is undef, do not check other for equivalencty
    const botMatches = !identityIsComposedOfOther(inspectedAddress.bot, otherAddress.bot);
    const channelIdMatches = !inspectedAddress.channelId || inspectedAddress.channelId === otherAddress.channelId;
    const userMatches = identityIsComposedOfOther(inspectedAddress.user, otherAddress.user);
    const convoMatches = identityIsComposedOfOther(inspectedAddress.conversation, otherAddress.conversation);

    return botMatches && channelIdMatches && userMatches && convoMatches;
}

export function addressIsComposedOfOtherTest(inspectedAddress: IAddress, otherAddress: IAddress): void {
    // if field is undef, do not check other for equivalencty
    identityIsComposedOfOtherTest(inspectedAddress.bot, otherAddress.bot, 'bot');
    identityIsComposedOfOtherTest(inspectedAddress.user, otherAddress.user, 'user');
    identityIsComposedOfOtherTest(inspectedAddress.conversation, otherAddress.conversation, 'conversation');
    const channelIdMatches = !inspectedAddress.channelId || expect(inspectedAddress.channelId).to.equal(otherAddress.channelId);
}
