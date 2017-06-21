"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
const Promise = require("bluebird");
const botbuilder_1 = require("botbuilder");
const expect = chai.expect;
exports.default = (sendMessageToBot, setBotToUserMessageChecker, defaultAddress) => class SendMessageToBotDialogStep {
    // for now, let the response only be in the form of a string. It can be abstracted later
    constructor(msg, expectedResponses, address) {
        address = address || defaultAddress;
        if (typeof (msg) === "string" && !defaultAddress && !address) {
            throw new Error('if message is a string, an address must be provided');
        }
        if (address) {
            const text = msg;
            this.message = new botbuilder_1.Message()
                .text(text)
                .address(address)
                .timestamp()
                .toMessage();
        }
        else {
            this.message = msg;
        }
        if (typeof (expectedResponses) === 'string') {
            expectedResponses = [expectedResponses];
        }
        // allow undef if it is not provided
        this.expectedResponses = expectedResponses && expectedResponses;
    }
    execute() {
        return new Promise((res, rej) => {
            setBotToUserMessageChecker((msg) => {
                if (!this.expectedResponses || msg.type === 'save')
                    return res();
                const currentExpectedResponse = this.expectedResponses.shift();
                try {
                    expect(msg.text, `Bot should have responded with '${currentExpectedResponse}', but was '${msg.text}`)
                        .to.be.equal(currentExpectedResponse);
                }
                catch (e) {
                    return rej(e);
                }
                if (!this.expectedResponses.length) {
                    res();
                }
            });
            sendMessageToBot(this.message);
        });
    }
};
//# sourceMappingURL=SendMessageToBotDialogStep.js.map