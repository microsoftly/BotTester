import * as promptDialog from './promptDialog';
import * as echoDialog from './echoDialog';
import * as setUserDataDialog from './setUserDataDialog';
import { UniversalBot, IConnector, ConsoleConnector } from 'botbuilder';
import { IDialogWaterfallStep } from 'botbuilder';

const dialog: IDialogWaterfallStep = (session) => session.userData = { data: session.message.text };

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
};

