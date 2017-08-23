import { IAddress, IIdentity, IMessage, Message } from 'botbuilder';
import * as chai from 'chai';
import * as chaiSamSam from 'chai-samsam';
import { ITestMessage, TestMessage } from './TestMessage'

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

export function convertStringToMessage(text: string, address: IAddress): ITestMessage {
    return new TestMessage()
        .text(text)
        .address(address)
        .toMessage();
}

export function convertRegExpToMessage(regexp: RegExp, address: IAddress): ITestMessage {
    return new TestMessage()
        .regexp(regexp)
        .address(address)
        .toMessage();
}

export function convertStringArrayToMessageArray(texts: string[], address: IAddress): ITestMessage[] {
    return texts.map((text: string) => convertStringToMessage(text, address));
}

export function convertRegExpArrayToMessageArray(regexps: RegExp[], address: IAddress): ITestMessage[] {
    return regexps.map((regexp: RegExp) => convertRegExpToMessage(regexp, address));
}

export function convertStringArrayTo2DMessageArray(texts: string[], address: IAddress): ITestMessage[][] {
    return texts.map((text: string) => convertStringArrayToMessageArray([text], address));
}

export function convertRegExpArrayTo2DMessageArray(regexps: RegExp[], address: IAddress): ITestMessage[][] {
    return regexps.map((regexp: RegExp) => convertRegExpArrayToMessageArray([regexp], address));
}

export function convert2DStringArrayTo2DMessageArray(collectionOfTexts: string[][], address: IAddress): ITestMessage[][] {
    return collectionOfTexts.map((texts: string[]) => convertStringArrayToMessageArray(texts, address));
}

export function convert2DRegExpArrayTo2DMessageArray(collectionOfRegexps: RegExp[][], address: IAddress): ITestMessage[][] {
    return collectionOfRegexps.map((regexps: RegExp[]) => convertRegExpArrayToMessageArray(regexps, address));
}

export function is2DArray(o: {}): boolean {
    return o instanceof Array && (o as {}[]).length &&
        o[0] instanceof Array && (o[0] as {}[]).length &&
        !(o[0][0] instanceof Array);
}

export function compareMessageWithExpectedMessages(actualResponse: IMessage, expectedResponseCollection: ITestMessage[]): void {
    // short circuit, no responses are expected
    if (!expectedResponseCollection.length) {
        return;
    }
    const expctedResponseStringsOrRegexps =
        // remove all non text possible repsonses
        expectedResponseCollection
            .filter((msg: ITestMessage) => {
              return msg.regexp || msg.text;
            })
            .map((r: ITestMessage) => {
              return r.regexp || r.text;
            });

    let errorString: string;

    if (expctedResponseStringsOrRegexps.length) {
        const errorStringExpectedResponseTextOrRegexp =
            expctedResponseStringsOrRegexps.length > 1 ? `one of ${expctedResponseStringsOrRegexps}` : expctedResponseStringsOrRegexps[0];

        if (typeof(errorStringExpectedResponseTextOrRegexp) == 'string') {
          errorString =
              `Bot should have responded with '${errorStringExpectedResponseTextOrRegexp}', but was '${actualResponse.text}`;

          expect(errorStringExpectedResponseTextOrRegexp, errorString).to.include(actualResponse.text);
        } else {
          errorString =
              `Bot should have responded with a message matching '${errorStringExpectedResponseTextOrRegexp}', but was '${actualResponse.text}`;

          expect(actualResponse.text, errorString).to.match(errorStringExpectedResponseTextOrRegexp);
        }
    }

    let matchExists: boolean = false;

    expectedResponseCollection.forEach((expectedResponse: ITestMessage) => {
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

        // If the test message contains a regex, delete the text for the comparison
        if (expectedResponse.regexp) {
          delete expectedResponse.text;
        }

        // Delete since IMessage doesn't have a regex
        delete expectedResponse.regexp;

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
