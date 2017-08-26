import * as Promise from 'bluebird';
import { IAddress, IMessage, Message, Session, UniversalBot } from 'botbuilder';
import { ExpectedMessage, PossibleExpectedMessageCollections, PossibleExpectedMessageType } from './ExpectedMessage';
import { botToUserMessageCheckerFunction, MessageService } from './MessageService';
import { SessionService } from './SessionService';

const DEFAULT_ADDRESS: IAddress = { channelId: 'console',
    user: { id: 'user1', name: 'user1' },
    bot: { id: 'bot', name: 'Bot' },
    conversation: { id: 'user1Conversation' }
};

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
     * @param defaultAddress (Optional) the address that will be assumed for all response expecations that do not include an address
     * if not defined, it defaults to
     { channelId: 'console',
        user: { id: 'user1', name: 'user1' },
        bot: { id: 'bot', name: 'Bot' },
        conversation: { id: 'user1Conversation' }
    };
    */
    //tslint:enable
    constructor(bot: UniversalBot, defaultAddress?: IAddress) {
        this.bot = bot;
        this.defaultAddress = defaultAddress || DEFAULT_ADDRESS;
        this.messageService = new MessageService(bot);
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
     * sends a message to a bot and compares bot responses against expectedResponsess
     * @param msg message to send to bot
     * @param expectedResponses (Optional) responses the bot-tester framework checks against
     */
    public sendMessageToBot(
        msg: IMessage | string,
        // currently only supports string RegExp IMessage
        expectedResponses?: PossibleExpectedMessageType | PossibleExpectedMessageCollections | PossibleExpectedMessageCollections[]
    ): BotTester {
        const message = this.convertToIMessage(msg);

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

        return this.sendMessageToBotInternal(message, this.sessionLoader.getInternalSaveMessage(message.address));
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
        expectedResponses: PossibleExpectedMessageType | PossibleExpectedMessageCollections | PossibleExpectedMessageCollections[]
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
