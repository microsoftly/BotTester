import { IDialogWaterfallStep, IPromptTextResult, Prompts, Session } from 'botbuilder';

export const USER_MESSAGE_TO_TRIGGER = 'set user data';
export const BOT_PROMPT = 'what would you like to set data to?';

const setUserDataDialog: [IDialogWaterfallStep] = [
    (session: Session) => Prompts.text(session, BOT_PROMPT),
    (session: Session, response: IPromptTextResult) => {
        session.userData = { data: response.response };

        session.save();
    }
];

export const dialog = setUserDataDialog;
