import { IDialogWaterfallStep, Prompts, IPromptTextResult } from 'botbuilder';

export const USER_MESSAGE_TO_TRIGGER = "set user data";
export const BOT_PROMPT = "what would you like to set data to?"

const setUserDataDialog: [IDialogWaterfallStep] = [
    (session) => Prompts.text(session, BOT_PROMPT),
    (session, response: IPromptTextResult) => {
        session.userData = { data: response.response }
        console.log(session.userData);
        session.save();
        session.endDialog('ending');
    }
];

export const dialog = setUserDataDialog;