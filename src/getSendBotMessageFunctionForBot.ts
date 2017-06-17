import * as chai from 'chai';
import { Message, IMessage, IAddress, IIdentity, UniversalBot } from 'botbuilder';

const expect = chai.expect;

export default function getSendBotMessageFunctionForBot(bot: UniversalBot, printMessage = (msg: IMessage) => {}) {
    return (message: IMessage | string, address?: IAddress) => {
        let messageToSend: IMessage;
        if(typeof message === 'string') {
            expect(address).not.to.be.null;
            messageToSend = new Message()
                .address(address)
                .text(message)
                .timestamp()
                .toMessage()
        } else {
            messageToSend = message;
        }

        return new Promise((res, rej) => {
            bot.receive(messageToSend, (e) => e ? rej(e) : res());
        })
        .then(() => printMessage(messageToSend));
    }
}