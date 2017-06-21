import * as promptDialog from './promptDialog';
import * as echoDialog from './echoDialog';
import * as setUserDataDialog from './setUserDataDialog';
import { UniversalBot, IConnector, ConsoleConnector } from 'botbuilder';
import { IDialogWaterfallStep } from 'botbuilder';

export const GIVE_RANDOM_COLOR_TRIGGER = 'tell me a random color';
export const COLORS = ['red', 'blue', 'green'];

export default function create(connector: IConnector = new ConsoleConnector()): UniversalBot {
    const bot = new UniversalBot(connector);
    bot.dialog('/', (session) => {
        switch(session.message.text) {
            case setUserDataDialog.USER_MESSAGE_TO_TRIGGER:
                session.beginDialog('userDataTest');
                break;
            case promptDialog.USER_MESSAGE_TO_TRIGGER:
                session.beginDialog('promptTest');
                break;
            case GIVE_RANDOM_COLOR_TRIGGER:
                session.send(COLORS)
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
};

