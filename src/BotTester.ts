import * as Promise from 'bluebird';
import { IAddress, IMessage, Message, Session, UniversalBot } from 'botbuilder';
import { config, IConfig } from './config';
import { ExpectedMessage, PossibleExpectedMessageCollections, PossibleExpectedMessageType } from './ExpectedMessage';
import { botToUserMessageCheckerFunction, MessageService } from './MessageService';
import { SessionService } from './SessionService';

export type checkSessionFunction = (s: Session) => void;
//tslint:disable
type TestStep = () => Promise<any>;
//tslint:enable

/**
 * Test builder and runner for botbuilder bots
 */
export class BotTester {
    private bot: UniversalBot;
    private defaultAddress: IAddress;
    private sessionLoader: SessionService;
    private messageService: MessageService;
    private testSteps: TestStep[];

    //tslint:disable
    /**
     *
     * @param bot bot that will be tested against
     * @param options (optional) options to pass to bot. Sets the default address and test timeout
     */
    //tslint:enable
    constructor(bot: UniversalBot, options: IConfig = config) {
        const defaultAndInputOptionMix = Object.assign({}, config, options);
        this.bot = bot;
        this.defaultAddress = config.defaultAddress;
        this.messageService = new MessageService(bot, defaultAndInputOptionMix);
        this.sessionLoader = new SessionService(bot);
        this.testSteps = [] as TestStep[];
    }

    /**
     * executes each test step serially
     */
    //tslint:disable
    public runTest(): Promise<any> {
    //tslint:enable
        return Promise.mapSeries(this.testSteps, (fn: TestStep) => fn());
    }

    /**
     * loads a session associated with an address and passes it to a user defined function
     * @param sessionCheckerFunction function passed in to inspect message
     * @param address (Optional) address of the session to load. Defaults to bot's default address if not defined
     */
    public checkSession(
        sessionCheckerFunction: checkSessionFunction,
        address?: IAddress
    ): BotTester {
        const runSessionChecker = () => this.sessionLoader.getSession(address || this.defaultAddress)
                                                .then(sessionCheckerFunction);

        this.testSteps.push(runSessionChecker);

        return this;
    }

    /**
     * sends a message to a bot and compares bot responses against expectedResponsess. Expected responses can be a variable number of args,
     * each of which can be a single expected response of any PossibleExpectedMessageType or a collection of PossibleExpectedMessageType
     * that mocks a randomly selected response by the bot
     * @param msg message to send to bot
     * @param expectedResponses (Optional) responses the bot-tester framework checks against
     */
    public sendMessageToBot(
        msg: IMessage | string,
        // currently only supports string RegExp IMessage
        ...expectedResponses: (PossibleExpectedMessageType | PossibleExpectedMessageType[])[]
    ): BotTester {
        const message = this.convertToIMessage(msg);

        // possible that expected responses may be undefined. Remove them
        expectedResponses = expectedResponses.filter((expectedResponse: {}) => expectedResponse);

        return this.sendMessageToBotInternal(message, expectedResponses);
    }

    /**
     * sends a message to the bot. This should be used whenever session.save() is used without sending a reply to the user. This exists due
     * to a limitation in the current implementation of the botbuilder framework
     *
     * @param msg message to send to bot
     */
    public sendMessageToBotAndExpectSaveWithNoResponse(
        msg: IMessage | string
    ): BotTester {
        const message = this.convertToIMessage(msg);

        return this.sendMessageToBotInternal(message, [this.sessionLoader.getInternalSaveMessage(message.address)]);
    }

    /**
     * Works exactly like Promise's .then function, except that the return value is not passed as an arg to the next function (even if its
     * another .then)
     * @param fn some function to run
     */
    //tslint:disable
    public then(fn: Function): BotTester {
    //tslint:enable
        this.testSteps.push(() => Promise.method(fn)());

        return this;
    }

    private convertToIMessage(msg: string | IMessage): IMessage {
        if (typeof(msg) === 'string') {
            return new Message()
                .text(msg as string)
                .address(this.defaultAddress)
                .toMessage();
        }

        return msg;
    }

    /**
     * Packages the expected messages into an ExpectedMessage collection to be handed off to the MessageService's sendMessageToBot function
     * @param message message to be sent to bot
     * @param expectedResponses expected responses
     */
    private sendMessageToBotInternal(
        message: IMessage,
        // currently only supports string RegExp IMessage
        expectedResponses: (PossibleExpectedMessageType | PossibleExpectedMessageType[])[]
        //PossibleExpectedMessageCollections | PossibleExpectedMessageCollections[]
    ): BotTester {
        let expectedMessages: ExpectedMessage[] = [];

        if (!expectedResponses) {
            expectedMessages = [];
        } else if (!(expectedResponses instanceof Array)) {
            expectedMessages = [new ExpectedMessage(expectedResponses)];
        } else if (expectedResponses instanceof Array) {
            if (expectedResponses.length > 0) {
                expectedMessages = (expectedResponses as PossibleExpectedMessageCollections[])
                // tslint:disable
                .map((currentExpectedResponseCollection:  PossibleExpectedMessageCollections) => new ExpectedMessage(currentExpectedResponseCollection));
                // tslint:enable
            }
        }

        this.testSteps.push(() => this.messageService.sendMessageToBot(message, expectedMessages));

        return this;
    }
}
