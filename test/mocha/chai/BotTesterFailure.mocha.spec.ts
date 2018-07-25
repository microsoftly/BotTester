import { IAddress, IDialogResult, IMessage, Message, Prompts, Session, UniversalBot } from 'botbuilder';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { BotTester } from './../../../src/BotTester';
import { TestConnector } from './../../../src/TestConnector';
import { getAdaptiveCard, getAdaptiveCardAttachment, getAdaptiveCardMessage } from './../../adaptiveCardProvider';

chai.use(chaiAsPromised);

const expect = chai.expect;

const connector = new TestConnector();

describe('BotTester', () => {
    let bot: UniversalBot;

    beforeEach(() => {
        bot = new UniversalBot(connector);
    });

    it('it will fail if an incorrect response is returned', (done: Function) => {
        bot.dialog('/', (session: Session) => {
            session.send('hello!');
        });

        expect(new BotTester(bot)
            .sendMessageToBot('Hola!', 'NOPE')
            .runTest()
        ).to.eventually.be.rejectedWith('Bot should have responded with \'NOPE\', but was \'hello!\'').notify(done);
    });

    it('will fail if one of multiple responses is incorrect', (done: Function) => {
        bot.dialog('/', (session: Session) => {
            session.send('hello!');
            session.send('how are you doing?');
        });

        expect(new BotTester(bot)
            .sendMessageToBot('Hola!', 'hello!', 'NOPE')
            .runTest()
        ).to.eventually.be.rejectedWith('Bot should have responded with \'NOPE\', but was \'how are you doing?\'').notify(done);
    });

    // ignore this for now. It's more of a debate as to whether or not the user should know not to do this
    it('it will fail if an empty collection is given', () => {
        bot.dialog('/', (session: Session) => {
            session.send('hello!');
        });

        try {
          new BotTester(bot).sendMessageToBot('Hola!', []);
        } catch (error) {
          expect(error.message).to.include('expected response collections cannot be empty');
        }
    });

    it('Will fail if response is not in the random response collection', (done: Function) => {
        const randomColors = ['red', 'green', 'blue', 'grey', 'gray', 'purple', 'magenta', 'cheese', 'orange', 'hazelnut'];
        bot.dialog('/', (session: Session) => {
            session.send(randomColors);
        });

        expect(new BotTester(bot)
            .sendMessageToBot('tell me a color!', ['this', 'is', 'not', 'in', 'the', 'collection'])
            .runTest()
        ).to.be.rejected.notify(done);
    });

    it('will fail if response to a prompt is not as expected', (done: Function) => {
        //tslint:disable
        bot.dialog('/', [(session: Session) => {
            new Prompts.text(session, 'Hi there! Tell me something you like');
        }, (session: Session, results: IDialogResult<string>) => {
            session.send(`${results.response} is pretty cool.`);
            new Prompts.text(session, 'Why do you like it?');
        //tslint:enable
        }, (session: Session) => session.send('Interesting. Well, that\'s all I have for now')]);

        expect(new BotTester(bot)
            .sendMessageToBot('Hola!', 'Hi there! Tell me something you like')
            .sendMessageToBot('The sky', 'this is wrong')
            .sendMessageToBot('It\'s blue', 'Interesting. Well, that\'s all I have for now')
            .runTest()
        ).to.be.rejected.notify(done);
    });

    it('will fail if decorated messages do not match', (done: Function) => {
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

        expect(new BotTester(bot)
            .sendMessageToBot('anything', nonMatchingCustomMessage)
            .runTest()
        ).to.be.rejected.notify(done);
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
            bot.dialog('/', (session: Session) => session.send(session.message.address.user.name));
        });

        it('incorrect address leads to failure, event with correct text', (done: Function) => {
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

            expect(new BotTester(bot)
                .sendMessageToBot(askForUser1Name, expectedAddressInMessage)
                .runTest()
            ).to.be.rejected.notify(done);
        });

        it('incorrect partial address leads to failure', (done: Function) => {
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

            expect(new BotTester(bot)
                .sendMessageToBot(askForUser1Name, expectedPartialAddress)
                .runTest()
            ).to.be.rejected.notify(done);
        });
    });

    it('will fail if regex does not match', (done: Function) => {
        const numberRegex = /^\d+/;

        bot.dialog('/', (session: Session) => {
            // send only numbers for this test case ....
            session.send(session.message.text);
        });

        expect(new BotTester(bot)
            .sendMessageToBot('abcd', numberRegex)
            .runTest()
        ).to.eventually.be.rejectedWith('\'abcd\' did not match any regex in /^\\d+/').notify(done);
    });

    it('will fail if function return an error', (done: Function) => {
        bot.dialog('/', (session: Session) => {
            session.send('hello!');
            session.send('13');
        });

        const botTester = new BotTester(bot)
            .sendMessageToBot('Hi', (message: IMessage) => {
                if (message.text === 'hello!') {
                    return true;
                }
            },                (message: IMessage) => {
                if (parseInt(message.text, 0) % 2 !== 0) {
                    return new Error(`Message is not an even number : '${message.text}'`);
                }
            });

        expect(botTester.runTest()).to.be.rejected.notify(done);
    });

    it('will fail if function return a bad string', (done: Function) => {
        bot.dialog('/', (session: Session) => {
            session.send('hello!');
        });

        const botTester = new BotTester(bot)
            .sendMessageToBot('Hi', (message: IMessage) => {
                return 'foo';
            });

        expect(botTester.runTest()).to.be.rejected.notify(done);
    });

    it('can timeout', (done: Function) => {
        const timeout = 1000;
        bot.dialog('/', (session: Session) => {
            // send only numbers for this test case ....
            setTimeout(() => session.send('hi there'), timeout * 2 );
        });

        expect(new BotTester(bot, { timeout })
            .sendMessageToBot('hey', 'hi there')
            .runTest()).to.be.rejected.notify(done);
    });

    it('will fail random order if response is not in collection', (done: Function) => {
        bot.dialog('/', (session: Session) => {
            session.send('hi');
            session.send('there');
            session.send('how are you?');
        });

        expect(new BotTester(bot)
            .sendMessageToBotIgnoringResponseOrder('anything', 'NOPE?', 'hi', 'there')
            .runTest()).to.be.rejected.notify(done);
    });

    it('will fail if a message filter is not correctly applied', (done: Function) => {
        bot.dialog('/', (session: Session) => {
            session.send('hello');
            session.send('how');
            session.send('are');
            session.send('you?');
        });

        const ignoreHowMessage = (message: IMessage) => !message.text.includes('how');
        const ignoreAreMessage = (message: IMessage) => !message.text.includes('are');

        expect(new BotTester(bot, { messageFilters: [ignoreHowMessage, ignoreAreMessage]})
            .sendMessageToBot('intro', 'hello', 'how', 'are', 'you?')
            .runTest()).to.be.rejected.notify(done);
    });

    it('will fail if a endOfConversationEvent is seen with an ingoreEndOfConversationEventFilter', (done: Function) => {
        bot.dialog('/', (session: Session) => {
            session.send('hello');
            session.endConversation();
        });

        expect(new BotTester(bot)
            // need to timeout before the tests do to catch the error
            .setTimeout(500)
            .ignoreEndOfConversationEvent()
            //tslint:disable
            .sendMessageToBot('hey', 'hello', {type: 'endOfConversation'} as any)
            //tslint:enable
            .runTest())
        .to.be.rejected.notify(done);
    });

    it('will fail if a typing event is seen with an ignoreTypingEventFilter', (done: Function) => {
        bot.dialog('/', (session: Session) => {
            session.send('hello');
            session.sendTyping();
            session.send('hey');
        });

        expect(new BotTester(bot)
            // need to timeout before the tests do to catch the error
            .setTimeout(500)
            .ignoreTypingEvent()
            //tslint:disable
            .sendMessageToBot('hey', 'hello', {type: 'typing'} as any, 'hey')
            //tslint:enable
            .runTest())
        .to.be.rejected.notify(done);
    });

    it('will fail when there are no matching adaptive cards', (done: Function) => {
        bot.dialog('/', (session: Session) => {
            session.send(getAdaptiveCardMessage());
        });

        const card = getAdaptiveCard();

        card.actions = [{title: 'this is not the correct title', type: 'this is no the correct type'}];

        const message = getAdaptiveCardMessage(card);

        expect(new BotTester(bot)
            .sendMessageToBot('anything', message)
            .runTest()).to.be.rejected.notify(done);
    });

    it('will fail when there are no attachments when they are expected', (done: Function) => {
        bot.dialog('/', (session: Session) => {
            session.send('hello');
        });

        const expectedMessage = getAdaptiveCardMessage();

        expectedMessage.text = 'hello';

        expect(new BotTester(bot)
            .sendMessageToBot('anything', expectedMessage)
            .runTest()).to.be.rejected.notify(done);
    });
});
