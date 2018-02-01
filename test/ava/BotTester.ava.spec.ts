import test from 'ava';
import { Context, TestContext } from 'ava';
import { IAddress, IMessage, Message, Prompts, Session, UniversalBot } from 'botbuilder';
import { BotTester } from './../../src/BotTester';
import { IConfig } from './../../src/config';
import { TestConnector } from './../../src/TestConnector';
import { getAdaptiveCard, getAdaptiveCardAttachment, getAdaptiveCardMessage } from './../adaptiveCardProvider';

const connector = new TestConnector();

interface IBotTestContext {
    bot: UniversalBot;
}

interface IAvaBotTest extends AvaTestContext {
    context: IBotTestContext;
}

//tslint:disable
type AvaTestContext = TestContext & Context<any>;
//tslint:enable

function getTestOptions(t: AvaTestContext): IConfig {
    return {
        assertionLibrary: 'ava',
        __internal__testContext: t
    };
}

test.beforeEach((t: IAvaBotTest) => {
    t.context.bot = new UniversalBot(connector);
});

test('can handle a single response', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    bot.dialog('/', (session: Session) => {
        session.send('hello!');
    });

    return new BotTester(bot, getTestOptions(t))
        .sendMessageToBot('Hola!', 'hello!')
        .runTest();
});

test('can handle multiple responses', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    bot.dialog('/', (session) => {
        session.send('hello!');
        session.send('how are you doing?');
    });

    new BotTester(bot, getTestOptions(t))
        .sendMessageToBot('Hola!', 'hello!', 'how are you doing?')
        .runTest();
});
