import * as Promise from 'bluebird';
import { IAddress, IMessage, Message, Session, UniversalBot } from 'botbuilder';
import { setTimeout } from 'timers';
import { IConfig, NO_TIMEOUT } from './config';
import { ExpectedMessage } from './ExpectedMessage';
import { OutgoingMessageComparator } from './OutgoingMessageComparator';

export type botToUserMessageCheckerFunction = (msg: IMessage | IMessage[]) => void;

function expectedResponsesAreEmpty(expectedResponses: {}[][]): boolean {
    return !expectedResponses ||  !expectedResponses.length || !expectedResponses[0].length;
}

/**
 * Handles sending messages to bot, intercepts the responses, and compares the response to the expected responses for the particular test
 * step
 */
export class MessageService {
    private bot: UniversalBot;
    private botToUserMessageChecker: botToUserMessageCheckerFunction;
    private config: IConfig;

    constructor(bot: UniversalBot, config: IConfig) {
        this.bot = bot;
        this.applyOutgoingMessageListener();
        // in case messages aren't checked in the frist step(s)
        //tslint:disable
        this.botToUserMessageChecker = (msg: IMessage | IMessage[]) => {};
        //tslint:enable
        this.config = config;
    }

    /**
     * Sends message to bot and sets the expectations for the responses.
     *
     * @param message message to send to bot
     * @param expectedResponses expected responses
     */
    public sendMessageToBot(
        message: IMessage,
        expectedResponses: ExpectedMessage[],
        ignoreOrder: boolean = false
    ): Promise<void> {
        const outgoingMessageComparator = new OutgoingMessageComparator(expectedResponses, ignoreOrder);
        const responsesFullyProcessedPromise = this.setBotToUserMessageChecker(expectedResponses, outgoingMessageComparator);

        const receiveMessagePromise = new Promise<void>((res: () => void, rej: (e: Error) => void) => {
            this.bot.receive(message, (e: Error) => e ? rej(e) : res());
        });

        let promiseToReturn = expectedResponses && expectedResponses.length ? responsesFullyProcessedPromise : receiveMessagePromise;

        if (this.config.timeout !== NO_TIMEOUT) {
            promiseToReturn = promiseToReturn.timeout(this.config.timeout);
        }

        return promiseToReturn
            .catch(Promise.TimeoutError, (e) => {
                return Promise.reject(outgoingMessageComparator.getTimeoutErrorMessage());
            });
    }

    /**
     * Sets the current response expectation function for the message service. This allows the botToUserMessageChecker property to be
     * updated within a closure with the proper expectedResponses. The promise that is returned will only resolve when all responses have
     * been seen. Many tests will hang here and fail if an expected response is never received
     *
     * @param expectedResponses collection of expected responses for a particular step
     */
    private setBotToUserMessageChecker(
        expectedResponses: ExpectedMessage[],
        outgoingMessageComparator: OutgoingMessageComparator
    ): Promise<void> {
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

    /**
     * Inject middleware to intercept outgoing messages to check their content
     */
    private applyOutgoingMessageListener(): void {
        this.bot.on('outgoing', (e: IMessage | IMessage[]) => {
            if (!(e instanceof Array)) {
                e = [e];
            }

            this.botToUserMessageChecker(e);
        });
    }
}
