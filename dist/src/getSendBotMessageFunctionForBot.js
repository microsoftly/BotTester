"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
const botbuilder_1 = require("botbuilder");
const expect = chai.expect;
function getSendBotMessageFunctionForBot(bot, printMessage = (msg) => { }) {
    return (message, address) => {
        let messageToSend;
        if (typeof message === 'string') {
            expect(address).not.to.be.null;
            messageToSend = new botbuilder_1.Message()
                .address(address)
                .text(message)
                .timestamp()
                .toMessage();
        }
        else {
            messageToSend = message;
        }
        return new Promise((res, rej) => {
            bot.receive(messageToSend, (e) => e ? rej(e) : res());
        })
            .then(() => printMessage(messageToSend));
    };
}
exports.default = getSendBotMessageFunctionForBot;
//# sourceMappingURL=getSendBotMessageFunctionForBot.js.map