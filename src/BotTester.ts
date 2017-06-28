import * as Promise from 'bluebird';
import { IAddress, IIdentity, IMessage, Message, Session, UniversalBot } from 'botbuilder';
import * as chai from 'chai';
import * as colors from 'colors';
import { IDialogTestStep } from './IDialogTestStep';
import { curriedInspectSessionDialogStepConstructor, InspectSessionDialogStepClassCreator } from './InspectSessionDialogStep';
import { curriedSendMessageToDialogStepConstructor, SendMessageToBotDialogStepClassCreator } from './SendMessageToBotDialogStep';
import { convertStringToMessage } from './utils';
const expect = chai.expect;

const DEFAULT_ADDRESS: IAddress = { channelId: 'console',
    user: { id: 'user1', name: 'user1' },
    bot: { id: 'bot', name: 'Bot' },
    conversation: { id: 'user1Conversation' }
};

const defaultPrintUserMessage = (msg: IMessage) => console.log(colors.magenta(`${msg.address.user.name}: ${msg.text}`));
const defaultPrintBotMessage = (msg: IMessage) => console.log(colors.blue(`bot: ${msg.text}`));


type TestSuite = {
    InspectSessionDialogStep: curriedInspectSessionDialogStepConstructor,
    SendMessageToBotDialogStep: curriedSendMessageToDialogStepConstructor,
    executeDialogTest(steps: IDialogTestStep[], done?: Function): Promise<void>,
    getSession(addr?: IAddress): Promise<Session>,
    sendMessageToBot(message: IMessage | string, address?: IAddress): Promise<any>,
    setBotToUserMessageChecker(newBotToUserMessageChecker: (msg: IMessage[]) => void) : void,
};

class TestSuiteBuilder {
    private bot: UniversalBot;
    private defaultAddress: IAddress;
    private botToUserMessageChecker: (msg: IMessage | IMessage[]) => void;
    private currentSessionLoadResolver: (s: Session) => void;

    private constructor(bot: UniversalBot, defaultAddress: IAddress = DEFAULT_ADDRESS) {
        this.bot = bot;
        this.defaultAddress = defaultAddress;

        this.applySessionSaveListener();
        this.applyOutgoingListener();
        this.applySessionLoadListener();
    }

    public static executeDialogTest(steps: IDialogTestStep[], done: Function = () => {}): Promise<void> {
        return Promise.mapSeries(steps, (step: IDialogTestStep) => {
            return step.execute();
        }).then(() => done());
    }

    //tslint:disable
    // the return object will be crazy complex and i'm lazy .... 
    public static createTestSuite(bot: UniversalBot, defaultAddress: IAddress = DEFAULT_ADDRESS): TestSuite{
    //tslint:enable
        const testSuite = new TestSuiteBuilder(bot, defaultAddress);

        // utility functions to allow custom built dialog test steps
        const getSession = testSuite.getSession.bind(testSuite);
        const sendMessageToBot = testSuite.sendMessageToBot.bind(testSuite);
        const setBotToUserMessageChecker = testSuite.setBotToUserMessageChecker.bind(testSuite);

        return {
            executeDialogTest: TestSuiteBuilder.executeDialogTest,

            // utility functions to allow custom built dialog test steps
            getSession,
            sendMessageToBot,
            setBotToUserMessageChecker,

            // prebuilt dialog test steps
            InspectSessionDialogStep: InspectSessionDialogStepClassCreator(getSession, defaultAddress),
            SendMessageToBotDialogStep: SendMessageToBotDialogStepClassCreator(sendMessageToBot, setBotToUserMessageChecker, defaultAddress)
        };
    }

    private setBotToUserMessageChecker(newBotToUserMessageChecker: (msg: IMessage | IMessage[]) => void) : void {
        this.botToUserMessageChecker = newBotToUserMessageChecker;
    }

    private sendMessageToBot(message: IMessage | string, address?: IAddress): Promise<any> {
        let messageToSend: IMessage;

        address = address || this.defaultAddress;

        if (typeof message === 'string') {
            messageToSend = convertStringToMessage(message, address);
        } else {
            messageToSend = message;
        }

        return new Promise((res: () => void, rej: (e: Error) => void) => {
            this.bot.receive(messageToSend, (e: Error) => e ? rej(e) : res());
        });
    }

    private applySessionSaveListener(): void {
        // routing is where create session is called. We're hihacking it to add our meta save function that will send the
        // messageReceivedHandler an event of type "save". This allows the executeDialogTest to continue the serial promise
        // execution even if a message is not explicitly returned to the user but session state is saved. Note that saving
        // session and sending a message back to the user in one dialog step will cause an error, but is also bad practice.
        // every time a message is sent to a user, session is saved implicitly.

        // tslint:disable
        // this is a critical hack that attaches an extra field onto session. Gonna just ignore this lint issue for now
        this.bot.on('routing', (session: any) => {
        // tslint:enable
            if (!session.saveUpdated) {
                session.saveUpdated = true;
                const saveEvent = new Message()
                    .address(session.message.address)
                    .toMessage();
                saveEvent.type = 'save';

                const save = session.save.bind(session);
                session.save = function(): Session {
                    save();
                    session.send(saveEvent);

                    return session;
                };
            }
        });
    }

    // used for checking if the messages sent to user are what was expected
    private applyOutgoingListener(): void {
        this.bot.on('outgoing', (e: IMessage | IMessage[]) => {
            if (!(e instanceof Array)) {
                e = [e];
            }

            e.forEach((msg: IMessage) => {
                if (msg.type === 'messsage') {
                    // printBotMessage(msg);
                }
            });

            this.botToUserMessageChecker(e);
        });
    }

    // if load session is called, a load message will be sent to the middleware.
    // this is a byproduct of createSession triggering dispatch which goes to the
    // middleware. By passing along a message with type 'load' we know that an end
    // user wants to inspect session, so we resolve any promise that he may be waiting
    // on and prevent futher execution of the middleware
    private applySessionLoadListener(): void {
        this.bot.use({
            botbuilder: (session: Session, next: Function) => {
                if (session.message.type === 'load') {
                    // its not actually supposed to be in the middleware, so unset this
                    session['inMiddleware'] = false;
                    this.currentSessionLoadResolver(session);
                } else {
                    next();
                }
            }
        });
    }

    private getSession(addr?: IAddress): Promise<Session> {
        addr = addr || this.defaultAddress;
        const bot = this.bot;

        return new Promise<Session>((res: (s: Session) => void, rej: Function) => {
            // This is a delicate hack that relies on knowing the private fields of a UniversalBot
            // The net effect is calling createSession with a message of type 'load' that gets
            // handled in the BotTester interception middleware (see applySessionLoadListener)
            const createSessionOriginal: Function = bot['createSession'];

            bot['createSession'] = function() {
                const args: any[] = Array.prototype.slice.call(arguments);

                const loadMsg = new Message()
                    .address(addr)
                    .toMessage();

                loadMsg.type = 'load';

                args[1] = loadMsg;

                bot['createSession'] = createSessionOriginal;

                return createSessionOriginal.apply(bot, args);
            };

            this.currentSessionLoadResolver = res;

            // this callback will never actually get called, but it sets off the events allowing
            // for the encapsulating promise to resolve
            this.bot.loadSession(addr, () => {});
        });
    }
}
/*

            executeDialogTest: TestSuite.executeDialogTest,

            // utility functions to allow custom built dialog test steps
            getSession,
            sendMessageToBot,
            setBotToUserMessageChecker,

            // prebuilt dialog test steps
            InspectSessionDialogStep: InspectSessionDialogStepClassCreator(getSession, defaultAddress),
            SendMessageToBotDialogStep: SendMessageToBotDialogStepClassCreator(sendMessageToBot, setBotToUserMessageChecker, defaultAddress)
*/

export function testSuiteBuilder(bot: UniversalBot, defaultAddress?: IAddress) {

    return TestSuiteBuilder.createTestSuite(bot, defaultAddress || DEFAULT_ADDRESS);
}
