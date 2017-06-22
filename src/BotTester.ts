import * as Promise from 'bluebird';
import { IAddress, IIdentity, IMessage, Message, Session, UniversalBot } from 'botbuilder';
import * as chai from 'chai';
import * as colors from 'colors';
import { IDialogTestStep } from './IDialogTestStep';
import { InspectSessionDialogStepClassCreator } from './InspectSessionDialogStep';
import { SendMessageToBotDialogStepClassCreator } from './SendMessageToBotDialogStep';

const expect = chai.expect;

const DEFAULT_ADDRESS: IAddress = { channelId: 'console',
    user: { id: 'user1', name: 'user1' },
    bot: { id: 'bot', name: 'Bot' },
    conversation: { id: 'user1Conversation' }
};

function getSendBotMessageFunctionForBot(bot: UniversalBot, printMessage = (msg: IMessage) => {}) {
    return (message: IMessage | string, address: IAddress = DEFAULT_ADDRESS) => {
        let messageToSend: IMessage;

        if (typeof message === 'string') {
            messageToSend = new Message()
                .address(address)
                .text(message)
                .timestamp()
                .toMessage();

        } else {
            messageToSend = message;
        }

        return new Promise((res: () => void, rej: (e: Error) => void) => {
            bot.receive(messageToSend, (e: Error) => e ? rej(e) : res());
        })
        .then(() => printMessage(messageToSend));
    }
}

const defaultPrintUserMessage = (msg: IMessage) => console.log(colors.magenta(`${msg.address.user.name}: ${msg.text}`));
const defaultPrintBotMessage = (msg: IMessage) => console.log(colors.blue(`bot: ${msg.text}`));

export function BotTester(
    bot: UniversalBot,
    defaultAddress: IAddress = DEFAULT_ADDRESS,
    printUserMessage = defaultPrintUserMessage,
    printBotMessage = defaultPrintBotMessage
) {
    const sendMessageToBot = getSendBotMessageFunctionForBot(bot, printUserMessage);

    let botToUserMessageChecker = (msg: IMessage | IMessage[]) => {};

    // tslint:disable
    // this wrapper is used to expose changing of the underlying function to external users
    const messageReceivedHandler = (msg: IMessage | IMessage[]) => botToUserMessageChecker(msg);
    // tslint:enable
    const setBotToUserMessageChecker =
        (newMessageChecker: (msg: IMessage | IMessage[]) => void) => botToUserMessageChecker = newMessageChecker;

    // routing is where create session is called. We're hihacking it to add our meta save function that will send the
    // messageReceivedHandler an event of type "save". This allows the executeDialogTest to continue the serial promise
    // execution even if a message is not explicitly returned to the user but session state is saved. Note that saving
    // session and sending a message back to the user in one dialog step will cause an error, but is also bad practice.
    // every time a message is sent to a user, session is saved implicitly.

    // tslint:disable
    // this is a critical hack that attaches an extra field onto session. Gonna just ignore this lint issue for now
    bot.on('routing', (session) => {
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

    bot.on('outgoing', (e: IMessage | IMessage[]) => {
        if (!(e instanceof Array)) {
            e = [e];
        }

        e.forEach((msg: IMessage) => {
            if (msg.type === 'messsage') {
                printBotMessage(msg);
            }
        });

        messageReceivedHandler(e);
    });

    function executeDialogTest(steps: [IDialogTestStep], done = () => {}): Promise {
        return Promise.mapSeries(steps, (step: IDialogTestStep) => step.execute())
                                            .then(() => done());
    }

    const getSession = (addr: IAddress = DEFAULT_ADDRESS) => new Promise((res: (s: Session) => void, rej: (e: Error) => void) => {
        bot.loadSession(addr, (e: Error, session: Session) => {
            if (e) {
                return rej(e);
            }

            res(session);
        });
    });

    // prebuild dialog test steps
    const SendMessageToBotDialogStep =
        SendMessageToBotDialogStepClassCreator(sendMessageToBot, setBotToUserMessageChecker, defaultAddress);

    const InspectSessionDialogStep =
        InspectSessionDialogStepClassCreator(getSession, defaultAddress);

    return {
        executeDialogTest,

        // utility functions to allow custom built dialog test steps
        getSession,
        sendMessageToBot,
        setBotToUserMessageChecker,

        // prebuilt dialog test steps
        InspectSessionDialogStep,
        SendMessageToBotDialogStep
    };
}
