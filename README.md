# Bot Tester for Bot Builder Framework [![CircleCI](https://circleci.com/gh/microsoftly/BotTester.svg?style=shield)](https://circleci.com/gh/microsoftly/BotTester) [![npm version](https://badge.fury.io/js/bot-tester.svg)](https://badge.fury.io/js/bot-tester) [![Coverage Status](https://coveralls.io/repos/github/microsoftly/BotTester/badge.svg?branch=master)](https://coveralls.io/github/microsoftly/BotTester?branch=master)
Simple framework that allows for easy testing of a botbuiler chatbot using mocha and chai.
## install
```bash
npm install --save bot-tester
```
## supported test libraries
1. mocha/chai
2. ava
## Class definitions, see the [BotTester Framework reference docs](https://microsoftly.github.io/BotTester/classes/_bottester_.bottester.html)
## config
config can be set one of 2 ways:

1. creating a bot-tester.json file in the root directory of your project.
2. passing in a config object into the options param when instantiating new instances of the BotTester


Passing in the config overrides any default values or values set by bot-tester.json. At the moment, the options are:
```typescript
{
    defaultAddress: botbuilder.IAddress,
    timeout: number // in milliseconds
    // each filter returns false for messages that the BotTester should ignore
    messageFilters: ((message:IMessage) => boolean)[],
    ignoreTypingEvent: boolean,
    ignoreEndOfConversationEvent: boolean,
    // Setting this to true will cause checkSession to hang and test to fail.
    ignoreInternalSaveMessage: boolean,

    // this will allow using different assertion libraries. Currently supported libraries are:
    // 1) chai
    // 2) ava

    // should this field not be provided, it will default to chai
    assertionLibrary: string,

    // certain test runners need to pass in a context. Currently, the following runners require this
    //    1) ava
    testContext: {}
}
```
if timeout is defined, then a particular ```runTest()``` call will fail if it does not receive each expected message within the timeout period of time set in the options.

additionally, config can be set by using the config updating options in the build chain, documented below in the example use

For a more in depth view, check out [the Bot Tester Framework Config doc](https://microsoftly.github.io/BotTester/interfaces/_config_.iconfig.html)
# Test runner setup
## Mocha/Chai
```javascript
const { UniversalBot } = require('botbuilder');
const { expect } = require('chai');
const { BotTester, TestConnector } = require('bot-tester');

describe('BotTester', () => {
    it('can handle a single response', () => {
        const bot = new UniversalBot(new TestConnector());

        bot.dialog('/', (session) => {
            session.send('hello!');
        });

        const botTesterOptions = {
            // the assertionLibrary field can be set in the bot-tester.json, but the default is mocha/chai. It can be omitted if the desired assertion library to use is chai.
            assertionLibrary: 'chai',

            // testContext is not used for chai expectations
        }

        return new BotTester(bot, botTesterOptions)
            .sendMessageToBot('Hola!', 'hello!')
            .runTest();
    });
```
## Ava
``` javascript
const test = require('ava');
const { UniversalBot } = require('botbuilder');
const { BotTester, TestConnector } = require('bot-tester');

test('can handle a single response', (t) => {
    const bot = new UniversalBot(new TestConnector());

    bot.dialog('/', (session) => {
        session.send('hello!');
    });

    const botTesterOptions = {
        // the assertionLibrary field can be set in the bot-tester.json, but testContext must be passed in for ava tests
        assertionLibrary: 'ava',
        testContext: t
    }

    return new BotTester(bot, botTesterOptions)
        .sendMessageToBot('Hola!', 'hello!')
        .runTest();
});
```

# Example Usage
All examples use mocha/chai, but the content will be similar regardless of the test runner
```javascript
import { IAddress, IMessage, Message, Prompts, Session, UniversalBot } from 'botbuilder';
import { expect } from 'chai';
import { BotTester, TestConnector } from 'bot-tester';
import { getAdaptiveCard, getAdaptiveCardAttachment, getAdaptiveCardMessage } from './adaptiveCardProvider';

const connector = new TestConnector();

describe('BotTester', () => {
    let bot;

    beforeEach(() => {
        bot = new UniversalBot(connector);
    });

    // ... tests live here!
```

# Test for single response
```javascript
    it('can handle a single response', () => {
        bot.dialog('/', (session) => {
            session.send('hello!');
        });

        const botTester = new BotTester(bot)
            .sendMessageToBot('Hola!', 'hello!');

        return botTester.runTest();
    });
```

# Test for multiple responses
```javascript
    it('can handle multiple responses', () => {
        bot.dialog('/', (session) => {
            session.send('hello!');
            session.send('how are you doing?');
        });

        new BotTester(bot)
            .sendMessageToBot('Hola!', 'hello!', 'how are you doing?')
            .runTest();
    });
```

# Test for random response arrays
```javascript
    // re-run the test multiple times to guarantee that multiple colors are returned
    let randomResponseRunCounter = 5;
    const randomColors = ['red', 'green', 'blue', 'grey', 'gray', 'purple', 'magenta', 'cheese', 'orange', 'hazelnut'];
    while (randomResponseRunCounter--) {
        it('Can handle random responses', () => {
            bot.dialog('/', (session) => {
                session.send(randomColors);
            });

            return new BotTester(bot)
                .sendMessageToBot('tell me a color!', randomColors)
                .runTest();
        });
    }
```

# Test with prompts
```javascript
    it('can test prompts', () => {
        bot.dialog('/', [(session) => {
            new Prompts.text(session, 'Hi there! Tell me something you like');
        }, (session, results) => {
            session.send(`${results.response} is pretty cool.`);
            new Prompts.text(session, 'Why do you like it?');
        }, (session) => session.send('Interesting. Well, that\'s all I have for now')]);

        return new BotTester(bot)
            .sendMessageToBot('Hola!', 'Hi there! Tell me something you like')
            .sendMessageToBot('The sky', 'The sky is pretty cool.', 'Why do you like it?')
            .sendMessageToBot('It\'s blue', 'Interesting. Well, that\'s all I have for now')
            .runTest();
    });
```

# Test Adaptive Cards
``` javascript
    it('can correctly check against adaptive cards', () => {
        bot.dialog('/', (session) => {
            session.send(getAdaptiveCardMessage());
        });

        return new BotTester(bot)
            .sendMessageToBot('anything', getAdaptiveCardMessage())
            .runTest();
    });
```

# Inspect session
```javascript
    it('can inspect session state', () => {
        bot.dialog('/', [(session) => {
            new Prompts.text(session, 'What would you like to set data to?');
        }, (session, results) => {
            session.userData = { data: results.response };
            session.save();
        }]);

        return new BotTester(bot)
            .sendMessageToBot('Start this thing!',  'What would you like to set data to?')
            .sendMessageToBotAndExpectSaveWithNoResponse('This is data!')
            .checkSession((session) => {
                expect(session.userData).not.to.be.null;
                expect(session.userData.data).to.be.equal('This is data!');
            })
            .runTest();
    });
```

# Test custom messages
```javascript
    it('can handle custom messages in response', () => {
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

        return new BotTester(bot)
            .sendMessageToBot('anything', customMessage)
            .sendMessageToBot('anything', matchingCustomMessage)
            .runTest();
    });
```

# Address/multiuser cases
```javascript
    describe('Address/multi user', () => {
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

        beforeEach(() => {
            bot.dialog('/', (session) => session.send(session.message.address.user.name));
        });
```

## Can check addressess, including partial addresses
```javascript
        it('can ensure proper address being used for routing. Includes partial address', () => {
            const askForUser1Name = new Message()
                .text('What is my name?')
                .address(defaultAddress)
                .toMessage();

            const expectedAddressInMessage = new Message()
                .address(defaultAddress)
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

            return new BotTester(bot)
                .sendMessageToBot(askForUser1Name, expectedAddressInMessage)
                .sendMessageToBot(askForUser1Name, expectedPartialAddress)
                .runTest();
        });
```

## Can have a default address assigned to the bot
```javascript
        // the bot can have a default address that messages are sent to. If needed, the default address can be ignored by sending an IMessage
        it('Can have a default address assigned to it and communicate to multiple users', () => {
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
            return new BotTester(bot, { defaultAddress })
                // because user 1 is the default address, the expected responses can be a string
                .sendMessageToBot(askForUser1Name, 'A')
                .sendMessageToBot(askForUser1Name, user1ExpectedResponse)
                .sendMessageToBot(askForUser2Name, user2ExpectedResponse)
                .runTest();
        });
    });
```

# Can test batch responses
```javascript
    it('can handle batch responses', () => {
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

        return new BotTester(bot, { defaultAddress: CUSTOMER_ADDRESS })
            .sendMessageToBot('anything', 'hello', 'there')
            .runTest();
    });
```

# Can test using regex
```javascript
    it('accepts RegExp', () => {
        const numberRegex = /^\d+/;

        bot.dialog('/', (session) => {
            // send only numbers for this test case ....
            session.send(session.message.text);
        });

        return new BotTester(bot)
            .sendMessageToBot('1', numberRegex)
            .sendMessageToBot('3156', numberRegex)
            .sendMessageToBot('8675309', numberRegex)
            .runTest();
    });
```

# variable # args can have mixed type
```javascript
    it('rest params can have mixed type', () => {
        const numberRegex = /^\d+/;

        bot.dialog('/', (session) => {
            session.send(session.message.text);
            session.send(session.message.text);
        });

        return new BotTester(bot)
            .sendMessageToBot('123', numberRegex, '123')
            .runTest();
    });
```

# Can perform arbitrary work between test steps
```javascript
    it('can do arbitrary work between test steps', () => {
        let responseString = 'goodbye';

        bot.dialog('/', (session) => {
            // send only numbers for this test case ....
            session.send(responseString);
        });

        return new BotTester(bot)
            .sendMessageToBot('you say', 'goodbye')
            .then(() => responseString = 'hello')
            .sendMessageToBot('and i say', 'hello')
            .runTest();
    });
```

# Can wait between test steps
```javascript
    it('can wait between test steps', () => {
        const delay = 1000;
        let beforeDelayTime;
        let afterDelayTime;

        bot.dialog('/', (session) => {
            // send only numbers for this test case ....
            if (afterDelayTime - beforeDelayTime >= delay) {
              session.send('i waited some time');
            }

        });

        return new BotTester(bot)
            .then(() => beforeDelayTime = Date.now())
            .wait(delay)
            .then(() => afterDelayTime = Date.now())
            .sendMessageToBot('have you waited ?', 'i waited some time')
            .runTest();
    });
```

# can check messages while ignoring order
``` javascript
    it('can accept messages without expectations for order', () => {
        bot.dialog('/', (session) => {
            session.send('hi');
            session.send('there');
            session.send('how are you?');
        });

        return new BotTester(bot)
            .sendMessageToBotIgnoringResponseOrder('anything', 'how are you?', 'hi', 'there')
            .runTest();
    });
```

# can apply one or more message filters in the BotTester options for messages to ignore
``` javascript
    it('can apply one or more message filters in the BotTester options for messages to ignore', () => {
        bot.dialog('/', (session) => {
            session.send('hello');
            session.send('how');
            session.send('are');
            session.send('you?');
        });

        const ignoreHowMessage = (message) => !message.text.includes('how');
        const ignoreAreMessage = (message) => !message.text.includes('are');

        return new BotTester(bot, { messageFilters: [ignoreHowMessage, ignoreAreMessage]})
            .sendMessageToBot('intro', 'hello', 'you?')
            .runTest();
    });
```

# can modify BotTester options
``` javascript
    describe('can modifiy options in line in builder chain', () => {
        it('add a message filter', () => {
            bot.dialog('/', (session) => {
                session.send('hello');
                session.send('there');
                session.send('green');
            });

            return new BotTester(bot)
                .addMessageFilter((msg) => !msg.text.includes('hello'))
                .addMessageFilter((msg) => !msg.text.includes('there'))
                .sendMessageToBot('hey', 'green')
                .runTest();
        });

        it('change timeout time', (done) => {
            const timeout = 750;
            bot.dialog('/', (session) => {
                setTimeout(() => session.send('hi there'), timeout * 2 );
            });

            expect(new BotTester(bot)
                .setTimeout(timeout)
                .sendMessageToBot('hey', 'hi there')
                .runTest()
            ).to.be.rejected.notify(done);
        });

        it('can ignore typing events', () => {
            bot.dialog('/', (session) => {
                session.send('hello');
                session.sendTyping();
                session.send('goodbye');
            });

            return new BotTester(bot)
                .ignoreTypingEvent()
                .sendMessageToBot('hey', 'hello', 'goodbye')
                .runTest();
        });
    });
```
