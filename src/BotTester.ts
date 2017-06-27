import * as Promise from 'bluebird';
import { IAddress, IIdentity, IMessage, Message, Session, UniversalBot } from 'botbuilder';
import * as chai from 'chai';
import * as colors from 'colors';
import { IDialogTestStep } from './IDialogTestStep';
import { InspectSessionDialogStepClassCreator } from './InspectSessionDialogStep';
import { SendMessageToBotDialogStepClassCreator } from './SendMessageToBotDialogStep';
import { convertStringToMessage } from './utils';
const expect = chai.expect;

const DEFAULT_ADDRESS: IAddress = { channelId: 'console',
    user: { id: 'user1', name: 'user1' },
    bot: { id: 'bot', name: 'Bot' },
    conversation: { id: 'user1Conversation' }
};

const defaultPrintUserMessage = (msg: IMessage) => console.log(colors.magenta(`${msg.address.user.name}: ${msg.text}`));
const defaultPrintBotMessage = (msg: IMessage) => console.log(colors.blue(`bot: ${msg.text}`));

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

    public static executeDialogTest(steps: IDialogTestStep[], done = () => {}): Promise<void> {
        return Promise.mapSeries(steps, (step: IDialogTestStep) => {
            return step.execute();
        }).then(() => done());
    }

    //tslint:disable
    // the return object will be crazy complex and i'm lazy .... 
    public static createTestSuite(bot: UniversalBot, defaultAddress: IAddress = DEFAULT_ADDRESS) {
    //tslint:enable
        const testSuiteBuilder = new TestSuiteBuilder(bot, defaultAddress);

        // utility functions to allow custom built dialog test steps
        const getSession = testSuiteBuilder.getSession.bind(testSuiteBuilder);
        const sendMessageToBot = testSuiteBuilder.sendMessageToBot.bind(testSuiteBuilder);
        const setBotToUserMessageChecker = testSuiteBuilder.setBotToUserMessageChecker.bind(testSuiteBuilder);

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

                    return this;
                }.bind(session);
            }
        });
    }

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

    private applySessionLoadListener(): void {
        this.bot.use({
            botbuilder: (session: Session, next: Function) => {
                if (session.message.type !== 'load') {
                    next();
                } else {
                    session['inMiddleware'] = false;
                    this.currentSessionLoadResolver(session);
                }
            }
        });
    }

    private getSession(addr?: IAddress): Promise<Session> {
        return new Promise<Session>((res: (s: Session) => void, rej: Function) => {
            const createSessionOriginal: Function = this.bot['createSession'];

            this.bot['createSession'] = function() {
                const args: any[] = Array.prototype.slice.call(arguments);

                const loadMsg = new Message().address(addr || this.defaultAddress).toMessage();
                loadMsg.type = 'load';

                args[1] = loadMsg;

                this.bot['createSession'] = createSessionOriginal;

                return createSessionOriginal.apply(this.bot, arguments);
            }.bind(this);

            this.currentSessionLoadResolver = res;

            this.bot.loadSession(addr, (error: Error, session: Session) => {
                if (error) {
                    return rej(error);
                }

                res(session);
            });
        });
    }
}

export function BotTester(bot: UniversalBot, defaultAddress: IAddress = DEFAULT_ADDRESS) {
    return TestSuiteBuilder.createTestSuite(bot, defaultAddress);
}
