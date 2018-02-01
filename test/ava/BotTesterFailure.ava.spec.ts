import test from 'ava';
import { Context, TestContext } from 'ava';
import { IAddress, IDialogResult, IMessage, Message, Prompts, Session, UniversalBot } from 'botbuilder';
import { BotTester } from './../../src/BotTester';
import { IConfig } from './../../src/config';
import { TestConnector } from './../../src/TestConnector';
import { getAdaptiveCard, getAdaptiveCardAttachment, getAdaptiveCardMessage } from './../adaptiveCardProvider';

const connector = new TestConnector();

interface IBotTestContext {
    bot: UniversalBot;
}

//tslint:disable
type AvaTestContext = TestContext & Context<any>;
//tslint:enable

interface IAvaBotTest extends AvaTestContext {
    context: IBotTestContext;
}

function getTestOptions(t: AvaTestContext): IConfig {
    return {
        assertionLibrary: 'ava',
        testContext: t
    };
}

test.beforeEach((t: IAvaBotTest) => {
    t.context.bot = new UniversalBot(connector);
});

test('it will fail if an incorrect response is returned', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    bot.dialog('/', (session: Session) => {
        session.send('hello!');
    });

    return t.throws(new BotTester(bot, getTestOptions(t))
        .sendMessageToBot('Hola!', 'NOPE')
        .runTest());
});

test('will fail if one of multiple responses is incorrect', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    bot.dialog('/', (session: Session) => {
        session.send('hello!');
        session.send('how are you doing?');
    });

    return t.throws(new BotTester(bot, getTestOptions(t))
        .sendMessageToBot('Hola!', 'hello!', 'NOPE')
        .runTest()
    );
});

// refer to mocha notes for skip reason
test.skip('it will fail if an empty collection is given', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    bot.dialog('/', (session: Session) => {
        session.send('hello!');
    });

    try {
        new BotTester(bot, getTestOptions(t)).sendMessageToBot('Hola!', []);
    } catch (error) {
        t.true(error.Message.includes('expected response collections cannot be empty'));
    }
});

test('Will fail if response is not in the random response collection', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    const randomColors = ['red', 'green', 'blue', 'grey', 'gray', 'purple', 'magenta', 'cheese', 'orange', 'hazelnut'];
    bot.dialog('/', (session: Session) => {
        session.send(randomColors);
    });

    return t.throws(new BotTester(bot, getTestOptions(t))
        .sendMessageToBot('tell me a color!', ['this', 'is', 'not', 'in', 'the', 'collection'])
        .runTest());
});

test('will fail if response to a prompt is not as expected', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    //tslint:disable
    bot.dialog('/', [(session: Session) => {
        new Prompts.text(session, 'Hi there! Tell me something you like');
    }, (session: Session, results: IDialogResult<string>) => {
        session.send(`${results.response} is pretty cool.`);
        new Prompts.text(session, 'Why do you like it?');
    //tslint:enable
    }, (session: Session) => session.send('Interesting. Well, that\'s all I have for now')]);

    return t.throws(new BotTester(bot, getTestOptions(t))
        .sendMessageToBot('Hola!', 'Hi there! Tell me something you like')
        .sendMessageToBot('The sky', 'this is wrong')
        .sendMessageToBot('It\'s blue', 'Interesting. Well, that\'s all I have for now')
        .runTest()
    );
});

test('will fail if decorated messages do not match', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    const customMessage: { someField?: {} } & IMessage = new Message()
        .text('this is text')
        .toMessage();

    customMessage.someField = {
        a: 1
    };
    customMessage.type = 'newType';

    const nonMatchingCustomMessage: { someField?: {} } & IMessage = new Message()
        .text('this is text')
        .toMessage();

    nonMatchingCustomMessage.someField = 'nope';
    nonMatchingCustomMessage.type = 'newType';

    bot.dialog('/', (session: Session) => {
        session.send(customMessage);
    });

    return t.throws(new BotTester(bot, getTestOptions(t))
        .sendMessageToBot('anything', nonMatchingCustomMessage)
        .runTest()
    );
});

const defaultAddress = { channelId: 'console',
    user: { id: 'user1', name: 'A' },
    bot: { id: 'bot', name: 'Bot' },
    conversation: { id: 'user1Conversation' }
};

const user2Address = { channelId: 'console',
    user: { id: 'user2', name: 'B' },
    bot: { id: 'bot', name: 'Bot' },
    conversation: { id: 'user2Conversation' }
};

function setupMultiUserAddressTest(bot: UniversalBot): void {
    bot.dialog('/', (session: Session) => session.send(session.message.address.user.name));
}

test('incorrect address leads to failure, event with correct text',  (t: IAvaBotTest) => {
    const bot = t.context.bot;

    setupMultiUserAddressTest(bot);

    const askForUser1Name = new Message()
        .text('What is my name?')
        .address(defaultAddress)
        .toMessage();

    const expectedAddressInMessage = new Message()
        .address(user2Address)
        .toMessage();

    const addr = {
        user: {
            id: 'user1'
        }
    } as IAddress;

    // partial addresses work as well (i.e. if you only want to check one field such as userId)
    const expectedPartialAddress = new Message()
        .address(addr)
        .toMessage();

    return t.throws(new BotTester(bot, getTestOptions(t))
        .sendMessageToBot(askForUser1Name, expectedAddressInMessage)
        .runTest()
    );
});

test('incorrect partial address leads to failure', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    setupMultiUserAddressTest(bot);

    const askForUser1Name = new Message()
    .text('What is my name?')
    .address(defaultAddress)
    .toMessage();

    const address = {
        user: {
            id: user2Address.user.id
        }
    } as IAddress;

    // partial addresses work as well (i.e. if you only want to check one field such as userId)
    const expectedPartialAddress = new Message()
        .address(address)
        .toMessage();

    return t.throws(new BotTester(bot, getTestOptions(t))
        .sendMessageToBot(askForUser1Name, expectedPartialAddress)
        .runTest()
    );
});

test('will fail if regex does not match', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    const numberRegex = /^\d+/;

    bot.dialog('/', (session: Session) => {
        // send only numbers for this test case ....
        session.send(session.message.text);
    });

    return t.throws(new BotTester(bot, getTestOptions(t))
        .sendMessageToBot('abcd', numberRegex)
        .runTest()
    );
});

test('can timeout', (t: IAvaBotTest) => {
    const timeout = 1000;

    const bot = t.context.bot;

    bot.dialog('/', (session: Session) => {
        // send only numbers for this test case ....
        setTimeout(() => session.send('hi there'), timeout * 2 );
    });

    return t.throws(new BotTester(bot, Object.assign({ timeout }, getTestOptions(t)))
        .sendMessageToBot('hey', 'hi there')
        .runTest());
});

test('will fail random order if response is not in collection', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    bot.dialog('/', (session: Session) => {
        session.send('hi');
        session.send('there');
        session.send('how are you?');
    });

    return t.throws(new BotTester(bot, getTestOptions(t))
        .sendMessageToBotIgnoringResponseOrder('anything', 'NOPE?', 'hi', 'there')
        .runTest());
});

test('will fail if a message filter is not correctly applied', (t: IAvaBotTest) => {
    const bot = t.context.bot;
    bot.dialog('/', (session: Session) => {
            session.send('hello');
            session.send('how');
            session.send('are');
            session.send('you?');
        });

    const ignoreHowMessage = (message: IMessage) => !message.text.includes('how');
    const ignoreAreMessage = (message: IMessage) => !message.text.includes('are');

    return t.throws(new BotTester(bot, { messageFilters: [ignoreHowMessage, ignoreAreMessage]})
            .sendMessageToBot('intro', 'hello', 'how', 'are', 'you?')
            .runTest());
    });

test('will fail if a endOfConversationEvent is seen with an ingoreEndOfConversationEventFilter', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    bot.dialog('/', (session: Session) => {
        session.send('hello');
        session.endConversation();
    });

    return t.throws(new BotTester(bot, getTestOptions(t))
        // need to timeout before the tests do to catch the error
        .setTimeout(500)
        .ignoreEndOfConversationEvent()
        //tslint:disable
        .sendMessageToBot('hey', 'hello', {type: 'endOfConversation'} as any)
        //tslint:enable
        .runTest());
});

test('will fail if a typing event is seen with an ignoreTypingEventFilter', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    bot.dialog('/', (session: Session) => {
        session.send('hello');
        session.sendTyping();
        session.send('hey');
    });

    return t.throws(new BotTester(bot, getTestOptions(t))
        // need to timeout before the tests do to catch the error
        .setTimeout(500)
        .ignoreTypingEvent()
        //tslint:disable
        .sendMessageToBot('hey', 'hello', {type: 'typing'} as any, 'hey')
        //tslint:enable
        .runTest());
});

test('will fail when there are no matching adaptive cards', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    bot.dialog('/', (session: Session) => {
        session.send(getAdaptiveCardMessage());
    });

    const card = getAdaptiveCard();

    card.actions = [{title: 'this is not the correct title', type: 'this is no the correct type'}];

    const message = getAdaptiveCardMessage(card);

    return t.throws(new BotTester(bot, getTestOptions(t))
        .sendMessageToBot('anything', message)
        .runTest());
});

test('will fail when there are no attachments when they are expected', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    bot.dialog('/', (session: Session) => {
        session.send('hello');
    });

    const expectedMessage = getAdaptiveCardMessage();

    expectedMessage.text = 'hello';

    return t.throws(new BotTester(bot, getTestOptions(t))
        .sendMessageToBot('anything', expectedMessage)
        .runTest());
});
