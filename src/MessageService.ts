import * as Promise from 'bluebird';
import { IAddress, IMessage, Message, Session, UniversalBot } from 'botbuilder';
import { ExpectedMessage } from './ExpectedMessage';
import { OutgoingMessageComparator } from './OutgoingMessageComparator';
import { convertStringToMessage } from './utils';

export type botToUserMessageCheckerFunction = (msg: IMessage | IMessage[]) => void;

function expectedResponsesAreEmpty(expectedResponses: {}[][]): boolean {
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
        message: IMessage,
        expectedResponses: ExpectedMessage[]
    ): Promise<void> {
        const responsesFullyProcessedPromise = this.setBotToUserMessageChecker(expectedResponses);

        const receiveMessagePromise = new Promise<void>((res: () => void, rej: (e: Error) => void) => {
            this.bot.receive(message, (e: Error) => e ? rej(e) : res());
        });

        return expectedResponses && expectedResponses.length ? responsesFullyProcessedPromise : receiveMessagePromise;
    }

    private convertMessageToBotToIMessage(
        msg: string | IMessage,
        address: IAddress
    ): IMessage {
        return typeof msg === 'string' ? convertStringToMessage(msg, address) : msg;
    }

    private setBotToUserMessageChecker(expectedResponses: ExpectedMessage[]): Promise<void> {
        const outgoingMessageComparator = new OutgoingMessageComparator(expectedResponses);

        return new Promise<void>((res: () => void, rej: (error: Error) => void) => {
            if (!outgoingMessageComparator.expectsAdditionalMessages()) {
                return res();
            }

            this.botToUserMessageChecker = (messages: IMessage | IMessage[]) => {
                if (!(messages instanceof Array)) {
                    messages = [messages];
                }

                messages.forEach((msg: IMessage) => {
                    try {
                        outgoingMessageComparator.compareOutgoingMessageToExpectedResponses(msg);
                    } catch (e) {
                        return rej(e);
                    }

                });

                if (!outgoingMessageComparator.expectsAdditionalMessages()) {
                    return res();
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
