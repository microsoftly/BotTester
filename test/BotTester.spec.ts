//```javascript
import { ConsoleConnector, IAddress, IMessage, Message, Prompts, Session, UniversalBot } from 'botbuilder';
import { expect } from 'chai';
import { BotTester } from './../src/BotTester';

const connector = new ConsoleConnector();

// lines with //# should be converted to headers for markdown docs
describe('BotTester', () => {
    let bot;

    beforeEach(() => {
        bot = new UniversalBot(connector);
    });

    // ... tests live here!
//```

//# Test for single response
//```javascript
    it('can handle a single response', () => {
        bot.dialog('/', (session) => {
            session.send('hello!');
        });

        const botTester = new BotTester(bot)
            .sendMessageToBot('Hola!', 'hello!');

        return botTester.runTest();
    });
//```

//# Test for multiple responses
//```javascript
    it('can handle multiple responses', () => {
        bot.dialog('/', (session) => {
            session.send('hello!');
            session.send('how are you doing?');
        });

        new BotTester(bot)
            .sendMessageToBot('Hola!', 'hello!', 'how are you doing?')
            .runTest();
    });
//```

//# Test for random response arrays
//```javascript
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
//```

//# Test with prompts
//```javascript
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
//```

//# Inspect session
//```javascript
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
//```

//# Test custom messages
//```javascript
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
//```

//# Address/multiuser cases
//```javascript
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
//```

//## Can check addressess, including partial addresses
//```javascript
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
//```

//## Can have a default address assigned to the bot
//```javascript
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
            return new BotTester(bot, defaultAddress)
                // because user 1 is the default address, the expected responses can be a string
                .sendMessageToBot(askForUser1Name, 'A')
                .sendMessageToBot(askForUser1Name, user1ExpectedResponse)
                .sendMessageToBot(askForUser2Name, user2ExpectedResponse)
                .runTest();
        });
    });
//```

//# Can test batch responses
//```javascript
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

        return new BotTester(bot, CUSTOMER_ADDRESS)
            .sendMessageToBot('anything', 'hello', 'there')
            .runTest();
    });
//```

//# Can test using regex
//```javascript
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
//```

//# variable # args can have mixed type
//```javascript
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
//```

//# Can perform arbitrary work between test steps
//```javascript
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
//```
    describe('Cases not for docs', () => {
        it('can handle undefined expectedResponses', () => {
            bot.dialog('/', (session: Session) => {
                session.send('hello');
            });

            return new BotTester(bot)
                .sendMessageToBot('this IS another thing')
                // send second message to make sure the tests can continue as expected
                .sendMessageToBot('this could be anything!', 'hello')
                .runTest();
        });
    });
});
