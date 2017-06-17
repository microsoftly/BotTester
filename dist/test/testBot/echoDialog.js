"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USER_MESSAGE_TO_TRIGGER = 'echo dialog';
exports.USER_MESSAGE_TO_END = 'end the echo dialog';
exports.BOT_LAST_MESSAGE = 'echo dialog has been terminated';
exports.dialog = (session) => {
    let msg = session.message.text;
    if (msg === exports.USER_MESSAGE_TO_END) {
        session.endDialog(exports.BOT_LAST_MESSAGE);
    }
    else {
        session.send(msg);
    }
};
//# sourceMappingURL=echoDialog.js.map