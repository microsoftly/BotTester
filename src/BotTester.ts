import * as Promise from 'bluebird';
import { IAddress, IMessage, Message, Session, UniversalBot } from 'botbuilder';
import { DEFAULT_ADDRESS } from './defaultAddress';
import { botToUserMessageCheckerFunction, MessageService } from './MessageService';
import { SessionService } from './SessionService';
import {
    convert2DStringArrayTo2DMessageArray,
    convertStringArrayTo2DMessageArray,
    convertStringToMessage,
    is2DArray
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
        expectedResponses?: string | string[] | string[][] | IMessage | IMessage[] | IMessage[][],
        address?: IAddress
    ): BotTester {
        const message = typeof(msg) === 'string' ? convertStringToMessage(msg, address) : msg as IMessage;
        address = address || this.defaultAddress;

        if (!expectedResponses) {
            expectedResponses = [[]];
        } else if (expectedResponses instanceof Array) {
            if (expectedResponses.length > 0 && typeof(expectedResponses) === 'string') {
                expectedResponses = [expectedResponses];
            }
        } else {
            expectedResponses = [[expectedResponses]] as IMessage[][] | string[][];
        }

        expectedResponses = this.convertExpectedResponsesParameterTo2DIMessageArray(expectedResponses, address) as IMessage[][];

        this.testSteps.push(() => this.messageService.sendMessageToBot(message, address, expectedResponses as IMessage[][]));

        return this;
    }

    public then(fn: () => {}): BotTester {
        this.testSteps.push(() => Promise.method(fn)());

        return this;
    }

    private convertExpectedResponsesParameterTo2DIMessageArray(
        expectedResponses: string | string[] | string[][] | IMessage | IMessage[] | IMessage[][],
        address: IAddress
    ) : IMessage[][] {

        expectedResponses = expectedResponses || [] as IMessage[][];

        if (is2DArray(expectedResponses)) {
            const responses = (expectedResponses as {}[][]);
            if (typeof(responses[0][0]) === 'string') {
                expectedResponses = convert2DStringArrayTo2DMessageArray(expectedResponses as string[][], address);
            }

        } else if (expectedResponses instanceof Array && expectedResponses.length && typeof(expectedResponses[0]) === 'string') {
            expectedResponses = convertStringArrayTo2DMessageArray(expectedResponses as string[], address);
        }

        return expectedResponses as IMessage[][];
    }
}
