import * as Promise from 'bluebird';
import { IAddress, IMessage, Message, Session, UniversalBot } from 'botbuilder';
import { compareMessageWithExpectedMessages, convertStringToMessage } from './utils';

export type botToUserMessageCheckerFunction = (msg: IMessage | IMessage[]) => void;

function expectedResponsesAreEmpty(expectedResponses: IMessage[][]): boolean {
    return !expectedResponses ||  !expectedResponses.length || !expectedResponses[0].length;
}

export class MessageService {
    private bot: UniversalBot;
    private botToUserMessageChecker: botToUserMessageCheckerFunction;

    constructor(bot: UniversalBot) {
        this.bot = bot;
        this.applyOutgoingMessageListener();
        // in case messages aren't checked in the frist step(s)
        this.botToUserMessageChecker = (msg: IMessage | IMessage[]) => {};
    }

    public sendMessageToBot(
        message: IMessage | string,
        address: IAddress,
        expectedResponses: IMessage[][]
    ): Promise<void> {
        const responsesFullyProcessedPromise = this.setBotToUserMessageChecker(expectedResponses);
        const messageToBot: IMessage = this.convertMessageToBotToIMessage(message, address);

        messageToBot.address = messageToBot.address || address;

        const receiveMessagePromise = new Promise<void>((res: () => void, rej: (e: Error) => void) => {
            this.bot.receive(messageToBot, (e: Error) => e ? rej(e) : res());
        });

        return expectedResponsesAreEmpty(expectedResponses) ? receiveMessagePromise : responsesFullyProcessedPromise;
    }

    private convertMessageToBotToIMessage(
        msg: string | IMessage,
        address: IAddress
    ): IMessage {
        return typeof msg === 'string' ? convertStringToMessage(msg, address) : msg;
    }

    private setBotToUserMessageChecker(expectedResponses: IMessage[][]): Promise<void> {
        if (expectedResponsesAreEmpty(expectedResponses)) {
            return Promise.resolve();
        }

        return new Promise<void>((res: () => void, rej: (error: Error) => void) => {
            this.botToUserMessageChecker = (messages: IMessage | IMessage[]) => {
                if (!expectedResponses || !expectedResponses.length) {
                    return res();
                }

                if (!(messages instanceof Array)) {
                    messages = [messages];
                }

                messages.forEach((msg: IMessage) => {
                    // save message is in place of a send response
                    if (msg.type === 'save') {
                        return res();
                    }

                    const currentExpectedResponseCollection = expectedResponses.shift();

                    try {
                        compareMessageWithExpectedMessages(msg, currentExpectedResponseCollection);
                    } catch (e) {
                        return rej(e);
                    }

                });

                if (!expectedResponses.length) {
                    res();
                }
            };
        });
    }

    private applyOutgoingMessageListener(): void {
        this.bot.on('outgoing', (e: IMessage | IMessage[]) => {
            if (!(e instanceof Array)) {
                e = [e];
            }

            this.botToUserMessageChecker(e);
        });
    }
}
