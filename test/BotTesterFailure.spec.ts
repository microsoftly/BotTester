//```javascript
import { ConsoleConnector, IAddress, IDialogResult, IMessage, Message, Prompts, Session, UniversalBot } from 'botbuilder';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { BotTester } from './../src/BotTester';

chai.use(chaiAsPromised);

const expect = chai.expect;

const connector = new ConsoleConnector();

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
        ).to.eventually.be.rejectedWith('expected [ \'NOPE\' ] to include \'hello!\'').notify(done);
    });

    it('will fail if one of multiple responses is incorrect', (done: Function) => {
        bot.dialog('/', (session: Session) => {
            session.send('hello!');
            session.send('how are you doing?');
        });

        expect(new BotTester(bot)
            .sendMessageToBot('Hola!', 'hello!', 'NOPE')
            .runTest()
        ).to.eventually.be.rejectedWith('expected [ \'NOPE\' ] to include \'how are you doing?\'').notify(done);
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

    xit('NOT SURE HOW TO TEST THIS ONE, IF AT ALLcan inspect session state', () => {
        bot.dialog('/', [(session: Session) => {
            //tslint:disable
            new Prompts.text(session, 'What would you like to set data to?');
            //tslint:enable
        }, (session: Session, results: IDialogResult<string>) => {
            session.userData = { data: results.response };
            session.save();
        }]);

        return new BotTester(bot)
            .sendMessageToBot('Start this thing!',  'What would you like to set data to?')
            .sendMessageToBotAndExpectSaveWithNoResponse('This is data!')
            .checkSession((session: Session) => {
                //tslint:disable
                expect(session.userData).not.to.be.null;
                //tslint:enable
                expect(session.userData.data).to.be.equal('This is data!');
            })
            .runTest();
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
        ).to.be.rejected.notify(done);
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
});
