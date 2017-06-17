"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const botbuilder_1 = require("botbuilder");
exports.USER_MESSAGE_TO_TRIGGER = "set user data";
exports.BOT_PROMPT = "what would you like to set data to?";
const setUserDataDialog = [
    (session) => botbuilder_1.Prompts.text(session, exports.BOT_PROMPT),
    (session, response) => {
        session.userData = { data: response.response };
        session.endDialog('ending');
    }
];
exports.dialog = setUserDataDialog;
//# sourceMappingURL=setUserDataDialog.js.map