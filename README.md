# Bot Tester for Bot Builder Framework [![CircleCI](https://circleci.com/gh/microsoftly/BotTester.svg?style=shield)](https://circleci.com/gh/microsoftly/BotTester)
Simple framework that allows for easy testing of a botbuiler chatbot using mocha and chai.
## install
```bash
npm install --save bot-tester
```

# Methods
## ``` constructor(UniversalBot, defaultAddress?)) ```
takes in a UniversalBot instance and optinally takes a default address to be used for all addresses without an explicit address. If not supplied, the default address is 
``` javascript
{ 
    channelId: 'console',
    user: { id: 'user1', name: 'user1' },
    bot: { id: 'bot', name: 'Bot' },
    conversation: { id: 'user1Conversation' }
}
```
## ``` sendMessageToBot(message, expectedResponseOrExpectedAddress?, expectedAddress?) ```
* message can be either a string or an IMessage
* responses can be one of teh following:
  * string, text that the bot responds with is compared directly
  * IMessage, text is compared and address has a partial comparison performed, only the fields provided in the expected response are compared
  * an array of either string or IMessage
    * These are if multiple messages are sent in a row without a user response
  * an array of array of string or IMessage
    * Each array represents a collection of possible responses ( for random responses)
 * expectedResponseOrExpectedAddress is optional
 * expectedAddress is optional, defaults to the default address on the BotTester
## ```checkSession(sessionCheckerFn, address?)```
* sessionCheckerFunction is a function that takes a single parameter that is a session
* address is optional and is the address of the session to be fetched. If not provided, the default address set on the bot is used.
## ```runTest()```
* executes the tests based on the script that has been built until this point.
* returns a promise
### note
All methods allow for method chaining. Each returns the original instance of BotTester e.g.
``` javascript
new BotTester(bot)
    .sendMessageToBot('Hello! My name is Elder Price')
    .sendMessageToBot('and I would like to share with you')
    .sendMessageToBot('the most amazing book')
    .checkSession(session => expect(session.conversationData.book).to.be.equal('The Book of Mormon'))
    .runTest()
```

# Example Usage
``` javascript
const botbuilder = require("botbuilder");
const chai = require("chai");
const { BotTester } = require("bot-tester");

const connector = new botbuilder.ConsoleConnector();

describe('BotTester', () => {
    let bot;

    beforeEach(() => {
        bot = new botbuilder.UniversalBot(connector);
    });

    // ... tests live here!
```
## Test for single response
``` javascript
    it('can handle a single response', () => {
        bot.dialog('/', (session) => {
            session.send('hello!');
        });

        const botTester = new BotTester(bot)
            .sendMessageToBot('Hola!', 'hello!');

        return botTester.runTest();
    });
```
## Test for multiple responses
``` javascript
    it('can handle multiple responses', () => {
        bot.dialog('/', (session) => {
            session.send('hello!');
            session.send('how are you doing?');
        });

        new BotTester(bot)
            .sendMessageToBot('Hola!', ['hello!', 'how are you doing?'])
            .runTest();
    });
```
## Can test against random response arrays
``` javascript
    // re-run the test multiple times to guarantee that multiple colors are returned
    let randomResponseRunCounter = 15;
    const colors = ['red', 'green', 'blue', 'grey', 'gray', 'purple', 'magenta', 'cheese', 'orange', 'hazelnut'];
    while (randomResponseRunCounter--) {
        it('Can handle random responses', () => {
            bot.dialog('/', (session) => {
                session.send(colors);
            });

            return new BotTester(bot)
                .sendMessageToBot('tell me a color!', [colors])
                .runTest();
        });
    }
```
### Simulate conversation
``` javascript
    it('can simulate conversation', () => {
        bot.dialog('/', [(session) => {
                new botbuilder.Prompts.text(session, 'Hi there! Tell me something you like');
            }, (session, results) => {
                session.send(`${results.response} is pretty cool.`);
                new botbuilder.Prompts.text(session, 'Why do you like it?');
            }, (session) => session.send('Interesting. Well, that\'s all I have for now')]);

        return new BotTester(bot)
            .sendMessageToBot('Hola!', 'Hi there! Tell me something you like')
            .sendMessageToBot('The sky', ['The sky is pretty cool.', 'Why do you like it?'])
            .sendMessageToBot('It\'s blue', 'Interesting. Well, that\'s all I have for now')
            .runTest();
    });
```
## Inspect session state
``` javascript
    it('can inspect session state', () => {
        bot.dialog('/', [(session) => {
                new botbuilder.Prompts.text(session, 'What would you like to set data to?');
            }, (session, results) => {
                session.userData = { data: results.response };
                session.save();
            }]);

        return new BotTester(bot)
            .sendMessageToBot('Start this thing!', 'What would you like to set data to?')
            .sendMessageToBot('This is data!')
            .checkSession((session) => {
            chai.expect(session.userData).not.to.be.null;
            chai.expect(session.userData.data).to.be.equal('This is data!');
        })
            .runTest();
    });
```

#### Address/multi user cases
``` javascript
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
## Ensure proper address is used for routing
``` javascript
        it('can ensure proper address being used for routing. Includes partial address', () => {
            const askForUser1Name = new botbuilder.Message()
                .text('What is my name?')
                .address(defaultAddress)
                .toMessage();

            const expectedAddressInMessage = new botbuilder.Message()
                .address(defaultAddress)
                .toMessage();

            const addr = {
                user: {
                    id: 'user1'
                }
            };

            // partial addresses work as well (i.e. if you only want to check one field such as userId)
            const expectedPartialAddress = new botbuilder.Message()
                .address(addr)
                .toMessage();

            return new BotTester(bot)
                .sendMessageToBot(askForUser1Name, expectedAddressInMessage)
                .sendMessageToBot(askForUser1Name, expectedPartialAddress)
                .runTest();
        });
```
## Assign default addresses and communicate to multiple users
``` javascript
        // the bot can have a default address that messages are sent to. If needed, this address can always be overriden
        it('Can have a default address assigned to it and communicate to multiple users', () => {
            const askForUser1Name = new botbuilder.Message()
                .text('What is my name?')
                .address(defaultAddress)
                .toMessage();

            const askForUser2Name = new botbuilder.Message()
                .text('What is my name?')
                .address(user2Address)
                .toMessage();

            // when testing for an address that is not the default for the bot, the address must be passed in
            return new BotTester(bot, defaultAddress)
                .sendMessageToBot(askForUser1Name, 'A')
                .sendMessageToBot(askForUser1Name, 'A', defaultAddress)
                .sendMessageToBot(askForUser2Name, 'B', user2Address)
                .runTest();
        });
    });
});
```