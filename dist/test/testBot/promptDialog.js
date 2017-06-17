"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const botbuilder_1 = require("botbuilder");
// these should not be hard coded into this dialog path
exports.USER_MESSAGE_TO_TRIGGER = "trigger prompt dialog";
exports.EXPECTED_USER_MESSAGE_RESPONSE = "I, as the user, am supplying a response";
exports.BOT_PROMPT_MESSAGE = "The bot is prompting for a response";
exports.BOT_ECHO_PREFIX = "The user responded with ";
exports.BOT_ECHO_USER_RESPONSE = exports.BOT_ECHO_PREFIX + exports.EXPECTED_USER_MESSAGE_RESPONSE;
exports.BOT_LAST_MESSAGE = "THIS IS THE LAST MESSAGE FOR THE PROMPT DIALOG";
const promptDialog = [
    (session) => {
        botbuilder_1.Prompts.text(session, exports.BOT_PROMPT_MESSAGE);
    },
    (session, results, next) => {
        let msg;
        if (results && results.response) {
            msg = exports.BOT_ECHO_PREFIX + results.response;
        }
        else {
            msg = "Sorry, it looks like you didn\'t send a response";
        }
        session.send(msg);
        next();
    },
    (session) => session.endDialog(exports.BOT_LAST_MESSAGE)
];
exports.dialog = promptDialog;
//# sourceMappingURL=promptDialog.js.map