import * as chai from 'chai'
import * as Promise from 'bluebird';
import { IAddress, IIdentity, IMessage, Message, UniversalBot } from 'botbuilder';
import { Session } from 'botbuilder';
import * as colors from 'colors';
import IDialogTestStep from './IDialogTestStep';
import SendMessageToBotDialogStepClassCreator from './SendMessageToBotDialogStep';
import InspectSessionDialogStepClassCreator from './InspectSessionDialogStep';

const expect = chai.expect;

const DEFAULT_ADDRESS: IAddress = { channelId: 'console',
    user: { id: 'user1', name: 'user1' }, 
    bot: { id: 'bot', name: 'Bot' },
    conversation: { id: 'user1Conversation' } 
};

function getSendBotMessageFunctionForBot(bot: UniversalBot, printMessage = (msg: IMessage) => {}) {
    return (message: IMessage | string, address: IAddress = DEFAULT_ADDRESS) => {
        let messageToSend: IMessage;

        if(typeof message === 'string') {
            messageToSend = new Message()
                .address(address)
                .text(message)
                .timestamp()
                .toMessage();

        } else {
            messageToSend = message;
        }

        return new Promise((res, rej) => {
            bot.receive(messageToSend, (e) => e ? rej(e) : res());
        })
        .then(() => printMessage(messageToSend));
    }
}

const defaultPrintUserMessage = (msg: IMessage) => console.log(colors.magenta(`${msg.address.user.name}: ${msg.text}`));
const defaultPrintBotMessage = (msg: IMessage) => console.log(colors.blue(`bot: ${msg.text}`));

function BotTester(
    bot: UniversalBot, 
    defaultAddress = DEFAULT_ADDRESS, 
    printUserMessage = defaultPrintUserMessage, 
    printBotMessage = defaultPrintBotMessage
) {
    const sendMessageToBot = getSendBotMessageFunctionForBot(bot, printUserMessage);

    let botToUserMessageChecker = (msg: IMessage | IMessage[]) => {}; 
    const messageReceivedHandler = (msg: IMessage | IMessage[]) => botToUserMessageChecker(msg);
    const setBotToUserMessageChecker = (newMessageChecker: (msg: IMessage | IMessage[]) => void) => botToUserMessageChecker = newMessageChecker;

    // routing is where create session is called. We're hihacking it to add our meta save function that will send the
    // messageReceivedHandler an event of type "save". This allows the executeDialogTest to continue the serial promise
    // execution even if a message is not explicitly returned to the user but session state is saved. Note that saving 
    // session and sending a message back to the user in one dialog step will cause an error, but is also bad practice.
    // every time a message is sent to a user, session is saved implicitly.
    bot.on('routing', (session) => {
        if(!session.saveUpdated) {
            session.saveUpdated = true;
            const saveEvent = new Message()
                .address(session.message.address)
                .toMessage();
            saveEvent.type = 'save';

            const save = session.save.bind(session);
            session.save = function() {
                save();
                session.send(saveEvent);
                return this
            }.bind(session);
        }
    })

    bot.on('outgoing', (e: IMessage | IMessage[]) => {
        if(!(e instanceof Array)) {
            e = [e];
        }

        e.forEach((msg) => {
            if(msg.type === 'messsage') {
                printBotMessage(msg);
            }
        });

        messageReceivedHandler(e);
    });

    function executeDialogTest(steps: [IDialogTestStep], done = () => {}) {
        return Promise.mapSeries(steps, 
            (step) => (step as IDialogTestStep).execute())
                .then(() => done());
    }

    const getSession = (addr: IAddress = DEFAULT_ADDRESS) => new Promise((res, rej) => {
        bot.loadSession(addr, (e, session) => {
            if(e) return rej(e);

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
    }
}

export default BotTester;
