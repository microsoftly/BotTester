import { IAddress, IIdentity, IMessage, Message } from 'botbuilder';
import * as chai from 'chai';

const expect = chai.expect;

export function convertStringToMessage(text: string, address: IAddress): IMessage {
    return new Message()
        .text(text)
        .address(address)
        .timestamp()
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

export function is2DArray(o: any): boolean {
    return o instanceof Array && (o as Array<any>).length &&
        o[0] instanceof Array && (o[0] as Array<any>).length &&
        !(o[0][0] instanceof Array);
}

export function compareMessageWtihExpectedMessages(actualResponse: IMessage, expectedResponseCollection: IMessage[]): void {
    const expectedAddress = expectedResponseCollection[0].address;
    const expctedResponseStrings = expectedResponseCollection.map((r: IMessage) => r.text);

    const errorStringExpectedResponseText =
        expctedResponseStrings.length > 1 ? `one of ${expctedResponseStrings}` : expctedResponseStrings[0];

    const errorString =
        `Bot should have responded with '${errorStringExpectedResponseText}', but was '${actualResponse.text}`;

    expect(expctedResponseStrings, errorString).to.include(actualResponse.text);

    addressIsComposedOfOtherTest(expectedAddress, actualResponse.address);
    //tslint:disable
    // expect(addressIsComposedOfOther(expectedAddress, actualResponse.address)).to.be.true;
    //tslint:enable
}

// its here

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
