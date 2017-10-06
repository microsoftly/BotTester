import * as Promise from 'bluebird';
import { IAddress, IMessage, Message, Session, UniversalBot } from 'botbuilder';
import { config, IConfig, MessageFilter } from './config';
import { ExpectedMessage, PossibleExpectedMessageCollections, PossibleExpectedMessageType } from './ExpectedMessage';
import { botToUserMessageCheckerFunction, MessageService } from './MessageService';
import { SessionService } from './SessionService';

export type checkSessionFunction = (s: Session) => void;
//tslint:disable
type TestStep = () => Promise<any>;
//tslint:enable

/**
 * methods that the Test builder can call to edit/modify the options. These can be called until any of the IBotTester method are called.
 */
export interface IOptionsModifier {
    /**
     * adds a message filter to the options.
     * @param filter message filter to add
     */
    addMessageFilter(filter: MessageFilter): BotTester;

    /**
     * sets the timeout time that the BotTester will wait for any particular message before failing
     */
    setTimeout(milliseconds: number): BotTester;
}

/**
 * Test builder/runner suite. After any of these are called, no functions in IConfigModified should be accessible
 */
export interface IBotTester {
    /**
     * executes each test step serially.
     */
    runTest(): Promise<{}>;

    /**
     * loads a session associated with an address and passes it to a user defined function
     * @param sessionCheckerFunction function passed in to inspect message
     * @param address (Optional) address of the session to load. Defaults to bot's default address if not defined
     */
    checkSession(sessionCheckerFunction: checkSessionFunction, address?: IAddress): IBotTester;

    /**
     * sends a message to a bot and compares bot responses against expectedResponsess. Expected responses can be a variable number of args,
     * each of which can be a single expected response of any PossibleExpectedMessageType or a collection of PossibleExpectedMessageType
     * that mocks a randomly selected response by the bot
     * @param msg message to send to bot
     * @param expectedResponses (Optional) responses the bot-tester framework checks against
     */
    sendMessageToBot(
        msg: IMessage | string,
        // currently only supports string RegExp IMessage
        ...expectedResponses: (PossibleExpectedMessageType | PossibleExpectedMessageType[])[]): IBotTester;

    /**
     * same as sendMessageToBot, but the order of responses is not checked. This will cause the test to hang until all messages it expects
     * are returned
     */
    sendMessageToBotIgnoringResponseOrder(
        msg: IMessage | string,
        // currently only supports string RegExp IMessage
        ...expectedResponses: (PossibleExpectedMessageType | PossibleExpectedMessageType[])[]
    ): IBotTester;

    /**
     * sends a message to the bot. This should be used whenever session.save() is used without sending a reply to the user. This exists due
     * to a limitation in the current implementation of the botbuilder framework
     *
     * @param msg message to send to bot
     */
    sendMessageToBotAndExpectSaveWithNoResponse(msg: IMessage | string): IBotTester;

    /**
     * Works exactly like Promise's .then function, except that the return value is not passed as an arg to the next function (even if its
     * another .then)
     * @param fn some function to run
     */
    then(fn: Function): IBotTester;

    /**
     * Waits for the given delay between test steps.
     * @param delayInMiliseconds time to wait in milliseconds
     */
    wait(delayInMilliseconds: number): IBotTester;
}

/**
 * Test builder and runner for botbuilder bots
 */
export class BotTester implements IBotTester, IOptionsModifier {
    private bot: UniversalBot;
    private sessionLoader: SessionService;

    // this is instantiated in the runTest function. This is done to allow any changes to the config to accumulate
    private messageService: MessageService;
    private testSteps: TestStep[];
    private config: IConfig;

    constructor(bot: UniversalBot, options: IConfig = config) {
        this.config = Object.assign({}, config, options);
        this.config.messageFilters = this.config.messageFilters.slice();
        this.bot = bot;
        this.messageService = new MessageService(bot, this.config);
        this.sessionLoader = new SessionService(bot);
        this.testSteps = [] as TestStep[];
    }

    public addMessageFilter(messageFilter: MessageFilter): BotTester {
        this.config.messageFilters.push(messageFilter);

        return this;
    }

    public setTimeout(milliseconds: number): BotTester {
        this.config.timeout = milliseconds;

        return this;
    }

    /**
     * Initializes the MessegeService here to allow config changes to accumulate
     */
    public runTest(): Promise<{}> {
        this.messageService = new MessageService(this.bot, this.config);

        return Promise.mapSeries(this.testSteps, (fn: TestStep) => fn());
    }

    public checkSession(
        sessionCheckerFunction: checkSessionFunction,
        address?: IAddress
    ): IBotTester {
        const runSessionChecker = () => this.sessionLoader.getSession(address || this.config.defaultAddress)
                                                .then(sessionCheckerFunction);

        this.testSteps.push(runSessionChecker);

        return this;
    }

    public sendMessageToBot(
        msg: IMessage | string,
        // currently only supports string RegExp IMessage
        ...expectedResponses: (PossibleExpectedMessageType | PossibleExpectedMessageType[])[]
    ): IBotTester {
        const message = this.convertToIMessage(msg);

        // possible that expected responses may be undefined. Remove them
        expectedResponses = expectedResponses.filter((expectedResponse: {}) => expectedResponse);

        return this.sendMessageToBotInternal(message, expectedResponses);
    }

    public sendMessageToBotIgnoringResponseOrder(
        msg: IMessage | string,
        // currently only supports string RegExp IMessage
        ...expectedResponses: (PossibleExpectedMessageType | PossibleExpectedMessageType[])[]
    ): IBotTester {
        const message = this.convertToIMessage(msg);

        // possible that expected responses may be undefined. Remove them
        expectedResponses = expectedResponses.filter((expectedResponse: {}) => expectedResponse);

        return this.sendMessageToBotInternal(message, expectedResponses, true);
    }

    public sendMessageToBotAndExpectSaveWithNoResponse(msg: IMessage | string): IBotTester {
        const message = this.convertToIMessage(msg);

        return this.sendMessageToBotInternal(message, [this.sessionLoader.getInternalSaveMessage(message.address)]);
    }

    public then(fn: Function): IBotTester {
        this.testSteps.push(() => Promise.method(fn)());

        return this;
    }

    public wait(delayInMilliseconds: number): IBotTester {
        this.testSteps.push(() => Promise.delay(delayInMilliseconds));

        return this;
    }

    private convertToIMessage(msg: string | IMessage): IMessage {
        if (typeof(msg) === 'string') {
            return new Message()
                .text(msg as string)
                .address(this.config.defaultAddress)
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
        expectedResponses: (PossibleExpectedMessageType | PossibleExpectedMessageType[])[],
        ignoreOrder: boolean = false
    ): BotTester {
        let expectedMessages: ExpectedMessage[] = [];

        if (!expectedResponses) {
            expectedMessages = [];
        } else if (!(expectedResponses instanceof Array)) {
            expectedMessages = [new ExpectedMessage(expectedResponses)];
        } else if (expectedResponses instanceof Array) {
            if (expectedResponses.length > 0) {
                expectedMessages = (expectedResponses as PossibleExpectedMessageCollections[])

                .map((currentExpectedResponseCollection:  PossibleExpectedMessageCollections) =>
                    new ExpectedMessage(currentExpectedResponseCollection));
            }
        }

        this.testSteps.push(() => this.messageService.sendMessageToBot(message, expectedMessages, ignoreOrder));

        return this;
    }
}
