import { ConsoleConnector, IAddress, IMessage, Message, Prompts, Session, UniversalBot } from 'botbuilder';
import { expect } from 'chai';
import { BotTester } from './../src/BotTester';

const connector = new ConsoleConnector();

describe('BotTester', () => {
    let bot;

    beforeEach(() => {
        bot = new UniversalBot(connector);
    });

    it('can handle a single response', () => {
        bot.dialog('/', (session) => {
            session.send('hello!');
        });

        const botTester = new BotTester(bot)
            .sendMessageToBot('Hola!', 'hello!');

        return botTester.runTest();
    });

    it('can handle multiple responses', () => {
        bot.dialog('/', (session) => {
            session.send('hello!');
            session.send('how are you doing?');
        });

        new BotTester(bot)
            .sendMessageToBot('Hola!', ['hello!', 'how are you doing?'])
            .runTest();
    });

    // re-run the test multiple times to guarantee that multiple colors are returned
    let randomResponseRunCounter = 5;
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

    it('can simulate conversation', () => {
        bot.dialog('/', [(session) => {
            new Prompts.text(session, 'Hi there! Tell me something you like');
        }, (session, results) => {
            session.send(`${results.response} is pretty cool.`);
            new Prompts.text(session, 'Why do you like it?');
        }, (session) => session.send('Interesting. Well, that\'s all I have for now')]);

        return new BotTester(bot)
            .sendMessageToBot('Hola!', 'Hi there! Tell me something you like')
            .sendMessageToBot('The sky', ['The sky is pretty cool.', 'Why do you like it?'])
            .sendMessageToBot('It\'s blue', 'Interesting. Well, that\'s all I have for now')
            .runTest();
    });

    it('can inspect session state', () => {
        bot.dialog('/', [(session) => {
            new Prompts.text(session, 'What would you like to set data to?');
        }, (session, results) => {
            session.userData = { data: results.response };
            session.save();
        }]);

        return new BotTester(bot)
            .sendMessageToBot('Start this thing!',  'What would you like to set data to?')
            .sendMessageToBot('This is data!')
            .checkSession((session) => {
                expect(session.userData).not.to.be.null;
                expect(session.userData.data).to.be.equal('This is data!');
            })
            .runTest();
    });

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

        const nonMatchingCustomMessage: { someField?: {} } & IMessage = new Message()
            .text('this is text')
            .toMessage();

        nonMatchingCustomMessage.someField = 'nope';
        nonMatchingCustomMessage.type = 'newType';

        bot.dialog('/', (session: Session) => {
            session.send(customMessage);
        });

        return new BotTester(bot)
            .sendMessageToBot('anything', customMessage)
            .sendMessageToBot('anything', matchingCustomMessage)
            .runTest();
    });

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

                // the bot can have a default address that messages are sent to. If needed, this address can always be overriden
        it('Can have a default address assigned to it and communicate to multiple users', () => {
            const askForUser1Name = new Message()
                .text('What is my name?')
                .address(defaultAddress)
                .toMessage();

            const askForUser2Name = new Message()
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
