"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
const Promise = require("bluebird");
const botbuilder_1 = require("botbuilder");
const colors = require("colors");
const SendMessageToBotDialogStep_1 = require("./SendMessageToBotDialogStep");
const InspectSessionDialogStep_1 = require("./InspectSessionDialogStep");
const expect = chai.expect;
function getSendBotMessageFunctionForBot(bot, printMessage = (msg) => { }) {
    return (message, address) => {
        let messageToSend;
        if (typeof message === 'string') {
            expect(address).not.to.be.null;
            messageToSend = new botbuilder_1.Message()
                .address(address)
                .text(message)
                .timestamp()
                .toMessage();
        }
        else {
            messageToSend = message;
        }
        return new Promise((res, rej) => {
            bot.receive(messageToSend, (e) => e ? rej(e) : res());
        })
            .then(() => printMessage(messageToSend));
    };
}
// class RoutingSession {
//     public saveUpdated: boolean;
//     public session 
//     constructor(session: Session) {
//     }
// }
const defaultPrintUserMessage = (msg) => console.log(colors.magenta(`${msg.address.user.name}: ${msg.text}`));
const defaultPrintBotMessage = (msg) => console.log(colors.blue(`bot: ${msg.text}`));
function BotTester(bot, defaultAddress, printUserMessage = defaultPrintUserMessage, printBotMessage = defaultPrintBotMessage) {
    const sendMessageToBot = getSendBotMessageFunctionForBot(bot, printUserMessage);
    let botToUserMessageChecker = (msg) => { };
    const messageReceivedHandler = (msg) => botToUserMessageChecker(msg);
    const setBotToUserMessageChecker = (newMessageChecker) => botToUserMessageChecker = newMessageChecker;
    // const loadSession = () => console.log("I SHOULD BE DOING A THING");
    // bot.loadSession = (address: IAddress, cb: (err: Error, session?: Session) => void) => {
    //     const saveEvent = new Message()
    //         .address(address)
    //         .toMessage();
    //     saveEvent.type = 'save';
    //     // loadSession(address, (err: Error, session: Session) => {
    //     //     if(err) return cb(err);
    //     //     const sessionSave = session.save;
    //     //     console.log('loading expected fucntion')
    //     //     session.save = function() {
    //     //         this.save();
    //     //         session.send(saveEvent);
    //     //         return this;
    //     //     }.bind(session);
    //     //     cb(err, session)
    //     // });
    // }
    bot.on('routing', (session) => {
        if (!session.saveUpdated) {
            session.saveUpdated = true;
            const saveEvent = new botbuilder_1.Message()
                .address(session.message.address)
                .toMessage();
            saveEvent.type = 'save';
            const save = session.save.bind(session);
            session.save = function () {
                save();
                session.send(saveEvent);
                return this;
            }.bind(session);
        }
    });
    bot.on('outgoing', (e) => {
        if (e.type === 'messsage') {
            printBotMessage(e);
        }
        // console.log(e.type);
        messageReceivedHandler(e);
    });
    function executeDialogTest(steps, done = () => { }) {
        return Promise.mapSeries(steps, (step) => step.execute())
            .then(() => done());
    }
    const getSession = (addr) => new Promise((res, rej) => {
        bot.loadSession(addr, (e, session) => {
            if (e)
                return rej(e);
            res(session);
        });
    });
    // prebuild dialog test steps
    const SendMessageToBotDialogStep = SendMessageToBotDialogStep_1.default(sendMessageToBot, setBotToUserMessageChecker, defaultAddress);
    const InspectSessionDialogStep = InspectSessionDialogStep_1.default(getSession, defaultAddress);
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
exports.default = BotTester;
//# sourceMappingURL=index.js.map