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

//tslint:disable
type AvaTestContext = TestContext & Context<any>;
//tslint:enable

interface IAvaBotTest extends AvaTestContext {
    context: IBotTestContext;
}

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

    bot.dialog('/', (session: Session) => {
        session.send('hello!');
        session.send('how are you doing?');
    });

    return new BotTester(bot, getTestOptions(t))
        .sendMessageToBot('Hola!', 'hello!', 'how are you doing?')
        .runTest();
});

let randomResponseRunCounter = 5;
const randomColors = ['red', 'green', 'blue', 'grey', 'gray', 'purple', 'magenta', 'cheese', 'orange', 'hazelnut'];
while (randomResponseRunCounter--) {
    test('Can handle random responses', (t: IAvaBotTest) => {
        const bot = t.context.bot;

        bot.dialog('/', (session: Session) => {
            session.send(randomColors);
        });

        return new BotTester(bot, getTestOptions(t))
            .sendMessageToBot('tell me a color!', randomColors)
            .runTest();
    });
}

test('can test prompts', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    // tslint:disable
    bot.dialog('/', [(session: Session) => {
        new Prompts.text(session, 'Hi there! Tell me something you like');
    }, (session: Session, results) => {
        session.send(`${results.response} is pretty cool.`);
        new Prompts.text(session, 'Why do you like it?');
    }, (session: Session) => session.send('Interesting. Well, that\'s all I have for now')]);
    // tslint:enable

    return new BotTester(bot, getTestOptions(t))
        .sendMessageToBot('Hola!', 'Hi there! Tell me something you like')
        .sendMessageToBot('The sky', 'The sky is pretty cool.', 'Why do you like it?')
        .sendMessageToBot('It\'s blue', 'Interesting. Well, that\'s all I have for now')
        .runTest();
});

test('can correctly test against adaptive cards', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    bot.dialog('/', (session: Session) => {
        session.send(getAdaptiveCardMessage());
    });

    return new BotTester(bot, getTestOptions(t))
        .sendMessageToBot('anything', getAdaptiveCardMessage())
        .runTest();
});

test('can inspect session state', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    //tslint:disable
    bot.dialog('/', [(session: Session) => {
        new Prompts.text(session, 'What would you like to set data to?');
    }, (session: Session, results) => {
        session.userData = { data: results.response };
        session.save();
    }]);
    //tslint:enable

    return new BotTester(bot)
        .sendMessageToBot('Start this thing!',  'What would you like to set data to?')
        .sendMessageToBotAndExpectSaveWithNoResponse('This is data!')
        .checkSession((session: Session) => {
            t.not(session.userData, null);
            t.not(session.userData, undefined);
            t.is(session.userData.data, 'This is data!');
        })
        .runTest();
});

test('can handle custom messages in response', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    const customMessage: { someField?: {} } & IMessage = new Message()
        .text('this is text')
        .toMessage();

    customMessage.someField = {
        a: 1
    };
    customMessage.type = 'newType';

    const matchingCustomMessage: { someField?: {} } & IMessage = new Message()
        .toMessage();

    matchingCustomMessage.text = 'this is text';
    matchingCustomMessage.type = 'newType';

    bot.dialog('/', (session: Session) => {
        session.send(customMessage);
    });

    return new BotTester(bot, getTestOptions(t))
        .sendMessageToBot('anything', customMessage)
        .sendMessageToBot('anything', matchingCustomMessage)
        .runTest();
});

function addressMultiUserSetup(bot: UniversalBot): void {
    bot.dialog('/', (session: Session) => session.send(session.message.address.user.name));
}

test('address/multiuser can ensure proper address being used four routing. includes partial address', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    addressMultiUserSetup(bot);

    const defaultAddress = { channelId: 'console',
        user: { id: 'customUser1', name: 'A' },
        bot: { id: 'customBot1', name: 'Bot1' },
        conversation: { id: 'customUser1Conversation' }
    };

    const user2Address = { channelId: 'console',
        user: { id: 'user2', name: 'B' },
        bot: { id: 'bot', name: 'Bot' },
        conversation: { id: 'user2Conversation' }
    };

    const askForUser1Name = new Message()
        .text('What is my name?')
        .address(defaultAddress)
        .toMessage();

    const expectedAddressInMessage = new Message()
        .address(defaultAddress)
        .toMessage();

    const addr = {
        user: {
            id: defaultAddress.user.id
        }
    } as IAddress;

    // partial addresses work as well (i.e. if you only want to check one field such as userId)
    const expectedPartialAddress = new Message()
        .address(addr)
        .toMessage();

    return new BotTester(bot, getTestOptions(t))
        .sendMessageToBot(askForUser1Name, expectedAddressInMessage)
        .sendMessageToBot(askForUser1Name, expectedPartialAddress)
        .runTest();
});

test('address/multiuser Can have a default address assigned to it and communicate to multiple users', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    addressMultiUserSetup(bot);

    const defaultAddress = { channelId: 'console',
        user: { id: 'customUser1', name: 'A' },
        bot: { id: 'customBot1', name: 'Bot1' },
        conversation: { id: 'customUser1Conversation' }
    };

    const user2Address = { channelId: 'console',
        user: { id: 'user2', name: 'B' },
        bot: { id: 'bot', name: 'Bot' },
        conversation: { id: 'user2Conversation' }
    };

    const askForUser1Name = new Message()
        .text('What is my name?')
        .address(defaultAddress)
        .toMessage();

    const askForUser2Name = new Message()
        .text('What is my name?')
        .address(user2Address)
        .toMessage();

    const user1ExpectedResponse = new Message()
        .text('A')
        .address(defaultAddress)
        .toMessage();

    const user2ExpectedResponse = new Message()
        .text('B')
        .address(user2Address)
        .toMessage();

    // when testing for an address that is not the default for the bot, the address must be passed in
    return new BotTester(bot, Object.assign({ defaultAddress }, getTestOptions(t)))
        // because user 1 is the default address, the expected responses can be a string
        .sendMessageToBot(askForUser1Name, 'A')
        .sendMessageToBot('What is my name?', user1ExpectedResponse)
        .sendMessageToBot(askForUser1Name, user1ExpectedResponse)
        .sendMessageToBot(askForUser2Name, user2ExpectedResponse)
        .runTest();
});

test('can handle batch responses', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    const CUSTOMER_ADDRESS: IAddress = { channelId: 'console',
        user: { id: 'userId1', name: 'user1' },
        bot: { id: 'bot', name: 'Bot' },
        conversation: { id: 'user1Conversation' }
    };

    const msg1 = new Message()
        .address(CUSTOMER_ADDRESS)
        .text('hello')
        .toMessage();

    const msg2 = new Message()
        .address(CUSTOMER_ADDRESS)
        .text('there')
        .toMessage();

    bot.dialog('/', (session: Session) => {
        bot.send([msg1, msg2]);
    });

    return new BotTester(bot, Object.assign({ defaultAddress: CUSTOMER_ADDRESS }, getTestOptions(t)))
        .sendMessageToBot('anything', 'hello', 'there')
        .runTest();
});

test('accepts RegExp', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    const numberRegex = /^\d+/;

    bot.dialog('/', (session: Session) => {
        // send only numbers for this test case ....
        session.send(session.message.text);
    });

    return new BotTester(bot, getTestOptions(t))
        .sendMessageToBot('1', numberRegex)
        .sendMessageToBot('3156', numberRegex)
        .sendMessageToBot('8675309', numberRegex)
        .runTest();
});

test('rest params can have mixed type', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    const numberRegex = /^\d+/;

    bot.dialog('/', (session: Session) => {
        session.send(session.message.text);
        session.send(session.message.text);
    });

    return new BotTester(bot, getTestOptions(t))
        .sendMessageToBot('123', numberRegex, '123')
        .runTest();
});

test('can do arbitrary work between test steps', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    let responseString = 'goodbye';

    bot.dialog('/', (session: Session) => {
        // send only numbers for this test case ....
        session.send(responseString);
    });

    return new BotTester(bot, getTestOptions(t))
    .sendMessageToBot('you say', 'goodbye')
    .then(() => responseString = 'hello')
    .sendMessageToBot('and i say', 'hello')
    .runTest();
});

test('can wait between test steps', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    const delay = 1000;
    let beforeDelayTime;
    let afterDelayTime;

    bot.dialog('/', (session: Session) => {
        // send only numbers for this test case ....
        if (afterDelayTime - beforeDelayTime >= delay) {
            session.send('i waited some time');
        }
    });

    return new BotTester(bot, getTestOptions(t))
        .then(() => beforeDelayTime = Date.now())
        .wait(delay)
        .then(() => afterDelayTime = Date.now())
        .sendMessageToBot('have you waited ?', 'i waited some time')
        .runTest();
});

test('can accept messages without expectations for order', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    bot.dialog('/', (session: Session) => {
        session.send('hi');
        session.send('there');
        session.send('how are you?');
    });

    return new BotTester(bot, getTestOptions(t))
        .sendMessageToBotIgnoringResponseOrder('anything', 'how are you?', 'hi', 'there')
        .runTest();
});

test('can apply one or more message filters in the BotTester options for messages to ignore', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    bot.dialog('/', (session: Session) => {
        session.send('hello');
        session.send('how');
        session.send('are');
        session.send('you?');
    });

    const ignoreHowMessage = (message: IMessage) => !message.text.includes('how');
    const ignoreAreMessage = (message: IMessage) => !message.text.includes('are');

    return new BotTester(bot, Object.assign({ messageFilters: [ignoreHowMessage, ignoreAreMessage]}, getTestOptions(t)))
        .sendMessageToBot('intro', 'hello', 'you?')
        .runTest();
});

test('can add a message filter', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    bot.dialog('/', (session: Session) => {
        session.send('hello');
        session.send('there');
        session.send('green');
    });

    return new BotTester(bot, getTestOptions(t))
        .addMessageFilter((msg: IMessage) => !msg.text.includes('hello'))
        .addMessageFilter((msg: IMessage) => !msg.text.includes('there'))
        .sendMessageToBot('hey', 'green')
        .runTest();
});

test('change timeout time', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    const timeout = 750;
    bot.dialog('/', (session: Session) => {
        setTimeout(() => session.send('hi there'), timeout * 2 );
    });

    return t.throws(new BotTester(bot,  getTestOptions(t))
        .setTimeout(timeout)
        .sendMessageToBot('hey', 'hi there')
        .runTest());
});

test('can ignore typing events', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    bot.dialog('/', (session: Session) => {
        session.send('hello');
        session.sendTyping();
        session.send('goodbye');
    });

    return new BotTester(bot, getTestOptions(t))
        .ignoreTypingEvent()
        .sendMessageToBot('hey', 'hello', 'goodbye')
        .runTest();
});

test('can handle undefined expectedResponses', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    bot.dialog('/', (session: Session) => {
        session.send('hello');
    });

    return new BotTester(bot, getTestOptions(t))
        .sendMessageToBot('this IS another thing')
        // send second message to make sure the tests can continue as expected
        .sendMessageToBot('this could be anything!', 'hello')
        .runTest();
});

test('can ensure adaptive cards are present, regardless of order', (t: IAvaBotTest) => {
    const bot = t.context.bot;

    bot.dialog('/', (session: Session) => {
        session.send(getAdaptiveCardMessage());
    });

    const matchingCard = getAdaptiveCard();
    const nonMatchingCard = getAdaptiveCard();

    nonMatchingCard.actions = [{title: 'this is not the correct title', type: 'this is no the correct type'}];

    const message1 = getAdaptiveCardMessage(nonMatchingCard);
    const message2 = getAdaptiveCardMessage(matchingCard);

    message1.attachments.push(getAdaptiveCardAttachment(matchingCard));
    message2.attachments.push(getAdaptiveCardAttachment(nonMatchingCard));

    return new BotTester(bot, getTestOptions(t))
        .sendMessageToBot('anything', message1)
        .sendMessageToBot('anything', message2)
        .runTest();
});
