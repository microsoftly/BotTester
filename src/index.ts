import * as chai from 'chai'
import * as Promise from 'bluebird';
import { IAddress, IIdentity, IMessage, Message, UniversalBot } from 'botbuilder';
import { Session } from 'botbuilder';
import * as colors from 'colors';
import IDialogTestStep from './IDialogTestStep';
import SendMessageToBotDialogStepClassCreator from './SendMessageToBotDialogStep';
import InspectSessionDialogStepClassCreator from './InspectSessionDialogStep';

const expect = chai.expect;

interface ISendData {
    user?: IIdentity,
    text: string,
    address: IAddress
};

function getSendBotMessageFunctionForBot(bot: UniversalBot, printMessage = (msg: IMessage) => {}) {
    return (message: IMessage | string, address?: IAddress) => {
        let messageToSend: IMessage;

        if(typeof message === 'string') {
            expect(address).not.to.be.null;

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

function isSendData(object: any): object is ISendData {
    return 'text' in object &&
        'address' in object;
}

const defaultPrintUserMessage = (msg: IMessage) => console.log(colors.magenta(`${msg.address.user.name}: ${msg.text}`));
const defaultPrintBotMessage = (msg: IMessage) => console.log(colors.blue(`bot: ${msg.text}`));


export default function BotTester(bot: UniversalBot, defaultAddress?: IAddress, printUserMessage = defaultPrintUserMessage, printBotMessage = defaultPrintBotMessage) {
    const sendMessageToBot = getSendBotMessageFunctionForBot(bot, printUserMessage);

    let botToUserMessageChecker = (text: string, address: IAddress) => {}; 
    const messageReceivedHandler = (message: ISendData) => botToUserMessageChecker(message.text, defaultAddress || message.address);
    const setBotToUserMessageChecker = (newMessageChecker: (text: string, address: IAddress) => void) => botToUserMessageChecker = newMessageChecker;

    bot.on('send', (e) => {
        printBotMessage(e);

        if(isSendData(e)) {
            messageReceivedHandler(e as ISendData);
        }
    });

    function executeDialogTest(steps: [IDialogTestStep], done = () => {}) {
        return Promise.mapSeries(steps, 
            (step) => (step as IDialogTestStep).execute())
                .then(() => done());
    }

    const getSession = (addr: IAddress) => new Promise((res, rej) => {
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
