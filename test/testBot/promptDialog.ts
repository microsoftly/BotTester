import { IDialogWaterfallStep, Prompts, IPromptTextResult } from 'botbuilder';

// these should not be hard coded into this dialog path
export const USER_MESSAGE_TO_TRIGGER = "trigger prompt dialog";
export const EXPECTED_USER_MESSAGE_RESPONSE = "I, as the user, am supplying a response";

export const BOT_PROMPT_MESSAGE = "The bot is prompting for a response";
export const BOT_ECHO_PREFIX = "The user responded with ";
export const BOT_ECHO_USER_RESPONSE = BOT_ECHO_PREFIX + EXPECTED_USER_MESSAGE_RESPONSE;
export const BOT_LAST_MESSAGE = "THIS IS THE LAST MESSAGE FOR THE PROMPT DIALOG";

const promptDialog: [IDialogWaterfallStep] = [
    (session) => {
        Prompts.text(session, BOT_PROMPT_MESSAGE);
    },
    (session, results: IPromptTextResult, next) => {
        let msg: string;

        if(results && results.response) {
            msg = BOT_ECHO_PREFIX + results.response;
        } else {
            msg = "Sorry, it looks like you didn\'t send a response";
        }

        session.send(msg);
        next();
    },
    (session) => session.endDialog(BOT_LAST_MESSAGE)
];

export const dialog = promptDialog;
