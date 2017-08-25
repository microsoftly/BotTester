import * as Promise from 'bluebird';
import { IAddress, IMessage, Message, Session, UniversalBot } from 'botbuilder';
import { DEFAULT_ADDRESS } from './defaultAddress';
import { ExpectedMessage, PossibleExpectedMessageCollections, PossibleExpectedMessageType } from './ExpectedMessage';
import { botToUserMessageCheckerFunction, MessageService } from './MessageService';
import { SessionService } from './SessionService';
import {
    convertStringToMessage
} from './utils';

export type checkSessionFunction = (s: Session) => void;
//tslint:disable
type TestStep = () => Promise<any>;
//tslint:enable

export class BotTester {
    private bot: UniversalBot;
    private defaultAddress: IAddress;
    private sessionLoader: SessionService;
    private messageService: MessageService;
    private testSteps: TestStep[];

    constructor(bot: UniversalBot, defaultAddress?: IAddress) {
        this.bot = bot;
        this.defaultAddress = defaultAddress || DEFAULT_ADDRESS;
        this.messageService = new MessageService(bot);
        this.sessionLoader = new SessionService(bot);
        this.testSteps = [] as TestStep[];
    }

    //tslint:disable
    public runTest(): Promise<any> {
    //tslint:enable
        return Promise.mapSeries(this.testSteps, (fn: TestStep) => fn());
    }

    public checkSession(
        sessionChecker: checkSessionFunction,
        address?: IAddress
    ): BotTester {
        const runSessionChecker = () => this.sessionLoader.getSession(address || this.defaultAddress)
                                                .then(sessionChecker);

        this.testSteps.push(runSessionChecker);

        return this;
    }

    public sendMessageToBot(
        msg: IMessage | string,
        // currently only supports string RegExp IMessage
        expectedResponses?: PossibleExpectedMessageType | PossibleExpectedMessageCollections | PossibleExpectedMessageCollections[]
    ): BotTester {
        const message = this.convertToIMessage(msg);

        return this.sendMessageToBotInternal(message, expectedResponses);
    }

    public sendMessageToBotAndExpectSaveWithNoResponse(
        msg: IMessage | string
    ): BotTester {
        const message = this.convertToIMessage(msg);

        return this.sendMessageToBotInternal(message, this.sessionLoader.getInternalSaveMessage(message.address));
    }

    //tslint:disable
    public then(fn: () => any): BotTester {
    //tslint:enable
        this.testSteps.push(() => Promise.method(fn)());

        return this;
    }

    private convertToIMessage(msg: string | IMessage): IMessage {
        return typeof(msg) === 'string' ? convertStringToMessage(msg, this.defaultAddress) : msg;
    }

    private sendMessageToBotInternal(
        msg: IMessage,
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

        this.testSteps.push(() => this.messageService.sendMessageToBot(msg, expectedMessages));

        return this;
    }
}
