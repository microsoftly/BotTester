"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promptDialog = require("./promptDialog");
const echoDialog = require("./echoDialog");
const setUserDataDialog = require("./setUserDataDialog");
const botbuilder_1 = require("botbuilder");
function create(connector = new botbuilder_1.ConsoleConnector()) {
    const bot = new botbuilder_1.UniversalBot(connector);
    bot.dialog('/', (session) => {
        switch (session.message.text) {
            case setUserDataDialog.USER_MESSAGE_TO_TRIGGER:
                session.beginDialog('userDataTest');
                break;
            case promptDialog.USER_MESSAGE_TO_TRIGGER:
                session.beginDialog('promptTest');
                break;
            default:
                session.beginDialog('echoTest');
                // session.send("whooops, looks like that's not a valid test dialog trigger!");
                break;
        }
    });
    bot.dialog('promptTest', promptDialog.dialog);
    bot.dialog('echoTest', echoDialog.dialog);
    bot.dialog('userDataTest', setUserDataDialog.dialog);
    return bot;
}
exports.default = create;
;
//# sourceMappingURL=createTestBot.js.map