import { ConsoleConnector, IConnector, Session, UniversalBot } from 'botbuilder';
import { IDialogWaterfallStep } from 'botbuilder';
import * as echoDialog from './echoDialog';
import * as promptDialog from './promptDialog';
import * as setUserDataDialog from './setUserDataDialog';

export const GIVE_RANDOM_COLOR_TRIGGER = 'tell me a random color';
export const COLORS = ['red', 'green', 'blue', 'grey', 'gray', 'purple', 'magenta', 'cheese', 'orange', 'hazelnut'];

export function createTestBot(connector: IConnector = new ConsoleConnector()): UniversalBot {
    const bot = new UniversalBot(connector);
    bot.dialog('/', (session: Session) => {
        switch (session.message.text) {
            case setUserDataDialog.USER_MESSAGE_TO_TRIGGER:
                session.beginDialog('userDataTest');
                break;
            case promptDialog.USER_MESSAGE_TO_TRIGGER:
                session.beginDialog('promptTest');
                break;
            case GIVE_RANDOM_COLOR_TRIGGER:
                session.send(COLORS);
                break;
            default:
                session.beginDialog('echoTest');
                break;
        }
    });

    bot.dialog('promptTest', promptDialog.dialog);
    bot.dialog('echoTest', echoDialog.dialog);
    bot.dialog('userDataTest', setUserDataDialog.dialog);

    return bot;
}
