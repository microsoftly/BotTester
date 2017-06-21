import { IDialogWaterfallStep } from 'botbuilder';

export const USER_MESSAGE_TO_TRIGGER = 'echo dialog';
export const USER_MESSAGE_TO_END = 'end the echo dialog';
export const BOT_LAST_MESSAGE = 'echo dialog has been terminated';

export const dialog: IDialogWaterfallStep = (session) => {
    let msg = session.message.text;

    if(msg === USER_MESSAGE_TO_END) {
        session.endDialog(BOT_LAST_MESSAGE);
    } else {
        session.send(msg);
    }
}
