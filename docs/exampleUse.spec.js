const mocha = require('mocha');
const builder = require('botbuilder');
const BotTester = require('../dist/src').default;
const { expect } = require('chai');

const connector = new builder.ConsoleConnector();

describe('BotTester Usage', () => {
    let bot;

    // Each test is showing the usage of the BotTester 
    // via default dialogs, so reinstantiate a new 
    // bot for each test
    beforeEach(() => {
        bot = new builder.UniversalBot(connector);
    })

    it('can handle a single response', () => {
        bot.dialog('/', (session) => {
            session.send('hello!');
        });

        const {
            executeDialogTest,
            SendMessageToBotDialogStep,
        } = BotTester(bot);

        return executeDialogTest([
            new SendMessageToBotDialogStep('Hola!', 'hello!'),
        ])
    })

    it('Can handle multiple responses', () => {
        bot.dialog('/', (session) => {
            session.send('hello!')
            session.send('how are you doing?');
        });

        const {
            executeDialogTest,
            SendMessageToBotDialogStep,
        } = BotTester(bot);

        return executeDialogTest([
            new SendMessageToBotDialogStep('Hola!', ['hello!', 'how are you doing?']),
        ])
    })

    // re-run the test multiple times to guarantee that multiple colors are returned
    let randomResponseRunCounter = 15;
    while(randomResponseRunCounter--) {
        const colors = ['red', 'green', 'blue', 'grey', 'gray', 'purple', 'magenta', 'cheese', 'orange', 'hazelnut'];
        it('Can handle random responses', () => {
            bot.dialog('/', (session) => {
                session.send(colors)
            });

            const {
                executeDialogTest,
                SendMessageToBotDialogStep,
            } = BotTester(bot);

            return executeDialogTest([
                new SendMessageToBotDialogStep('Tell me a color!', [colors]),
            ])
        })
    }

    it('Can simulate conversation', () => {
        bot.dialog('/', [(session) => {
            new builder.Prompts.text(session, 'Hi there! Tell me something you like')
        }, (session, results) => {
            session.send(`${results.response} is pretty cool.`);
            new builder.Prompts.text(session, 'Why do you like it?');
        }, (session) => session.send('Interesting. Well, that\'s all I have for now')]);


        const {
            executeDialogTest,
            SendMessageToBotDialogStep,
        } = BotTester(bot);
        
        return executeDialogTest([
            new SendMessageToBotDialogStep('Hola!', 'Hi there! Tell me something you like'),
            new SendMessageToBotDialogStep('The sky', ['The sky is pretty cool.', 'Why do you like it?']),
            new SendMessageToBotDialogStep('It\'s blue', 'Interesting. Well, that\'s all I have for now')
        ])
    })

    it('Can inspect session state', () => {
        bot.dialog('/', [(session) => {
            new builder.Prompts.text(session, 'What would you like to set data to?')
        }, (session, results) => {
            session.userData = { data: results.response };
            session.save();
        }]);


        const {
            executeDialogTest,
            SendMessageToBotDialogStep,
            InspectSessionDialogStep,
        } = BotTester(bot);

        return executeDialogTest([
            // having expected responses is not necessary
            new SendMessageToBotDialogStep('Start this thing!'),
            new SendMessageToBotDialogStep('This is data!'),
            new InspectSessionDialogStep((session) => {
                expect(session.userData).not.to.be.null;
                expect(session.userData.data).to.equal('This is data!');
            })
        ])
    })

    it('Can communicate to multiple users', () => {
        const user1Address = { channelId: 'console',
            user: { id: 'user1', name: 'A' }, 
            bot: { id: 'bot', name: 'Bot' },
            conversation: { id: 'user1Conversation' } 
        };

        const user2Address = { channelId: 'console',
            user: { id: 'user2', name: 'B' }, 
            bot: { id: 'bot', name: 'Bot' },
            conversation: { id: 'user2Conversation' } 
        };

        bot.dialog('/', (session) => session.send(session.message.address.user.name));

        const {
            executeDialogTest,
            SendMessageToBotDialogStep,
        } = BotTester(bot);

        // sendMessageToBotDialogStep can accept botbuilder messages!
        const askForUser1Name = new builder.Message()
            .text('What is my name?')
            .address(user1Address)
            .toMessage();
        
        const askForUser2Name = new builder.Message()
            .text('What is my name?')
            .address(user2Address)
            .toMessage();


        return executeDialogTest([
            new SendMessageToBotDialogStep(askForUser1Name, 'A'),
            new SendMessageToBotDialogStep(askForUser2Name, 'B')
        ]);
    })

    it('Can allow for custom DialogStepDefinitions', () => {
        bot.dialog('/', [(session) => {
            new builder.Prompts.text(session, 'What would you like to set data to?')
        }, (session, results) => {
            session.userData = { data: results.response };
            session.save();
        }]);

        const {
            executeDialogTest,

            // Utility functions to allow for custom DialogSteps
            getSession,
            sendMessageToBot,
            setBotToUserMessageChecker,
        } = BotTester(bot);

        // A DialogStep is a class that has an execute function that returns a promise whent he check is done
        class GreetingStep {
            execute() {
                return new Promise((res, rej) => {
                    // an array is always passed to this function, even if there is only one message in the response
                    // this is the case because the bot can send messages in batches
                    setBotToUserMessageChecker((messages) => {
                        expect(messages.length).to.equal(1);
                        const message = messages[0];

                        expect(message.text).to.equal('What would you like to set data to?')
                        res();
                    })

                    // send message to the bot. Any message returned will be sent to the botToUserMessageChecker
                    // set above. The execute step should only resolve once the message checker has confirmed 
                    // a proper value has been returned.
                    sendMessageToBot('Greetings!')
                })
            }
        }

        class SaySevenStep {
            execute() {
                return new Promise((res, rej) => {
                    setBotToUserMessageChecker((messages) => {
                        expect(messages.length).to.equal(1);
                        const message = messages[0];

                        // In the case that a bot does not respond, but session state is changed, i.e. session.save()
                        // is called, the bot responds to the user with a message with no text whose type is 'save'
                        // this lets the test/user know that the session save has completed.

                        // If session.save() is called multiple times, then this function will have to know how many times
                        // it is called before resolving. This is a likely edge case that you will run into
                        expect(message.type).to.equal('save');
                        res()
                    })

                    // send message to the bot.
                    sendMessageToBot('seven')
                })
            }
        }

        class EnsureUserDataHasSevenStep {
            execute() {
                return getSession()
                    .then((session) => expect(session.userData.data).to.equal('seven'));
            }
        }

        return executeDialogTest([
            new GreetingStep(),
            new SaySevenStep(),
            new EnsureUserDataHasSevenStep()
        ]);
    })
}) 

