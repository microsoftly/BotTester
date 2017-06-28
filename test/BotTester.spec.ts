import { ConsoleConnector, IAddress, Message, Prompts, UniversalBot } from 'botbuilder';
import * as chai from 'chai';
import {} from 'mocha';
import { testSuiteBuilder } from '../src/index';
import { createTestBot } from './testBot/createTestBot';
import { COLORS, GIVE_RANDOM_COLOR_TRIGGER } from './testBot/createTestBot';
import * as echoDialog from './testBot/echoDialog';
import * as promptDialog from './testBot/promptDialog';
import * as setUserDataDialog from './testBot/setUserDataDialog';

const expect = chai.expect;

describe('Bot Tester', () => {
    let executeDialogTest;

    // tslint:disable
    let SendMessageToBotDialogStep;
    let InspectSessionDialogStep;
    // tslint:disable

    beforeEach(() =>  {
        const bot =  createTestBot();
        const botTester = testSuiteBuilder(bot);

        executeDialogTest = botTester.executeDialogTest;
        SendMessageToBotDialogStep = botTester.SendMessageToBotDialogStep;
        InspectSessionDialogStep = botTester.InspectSessionDialogStep;
    })

    it('run example for prompt dialog', () => {
        return executeDialogTest([
            new SendMessageToBotDialogStep(
                promptDialog.USER_MESSAGE_TO_TRIGGER,
                promptDialog.BOT_PROMPT_MESSAGE),
            new SendMessageToBotDialogStep(
                promptDialog.EXPECTED_USER_MESSAGE_RESPONSE,
                [promptDialog.BOT_ECHO_USER_RESPONSE, promptDialog.BOT_LAST_MESSAGE])
        ]);
    })

    let randomResponseRunCounter = 15;
    while(randomResponseRunCounter--) {
        it('can handle randomized responses', () => {
            return executeDialogTest([
                new SendMessageToBotDialogStep(GIVE_RANDOM_COLOR_TRIGGER, [COLORS])
            ])
        });
    }

    it('can inspect session', () => {
        const data = "this is data";

        return executeDialogTest([
            new SendMessageToBotDialogStep(setUserDataDialog.USER_MESSAGE_TO_TRIGGER),
            new SendMessageToBotDialogStep(data),
            new InspectSessionDialogStep((session) => {
                expect(session.userData.data).to.equal(data);
            })
        ]);
    });

    it('can inspect session after a dialog occurs', () => {
        const bot =  new UniversalBot(new ConsoleConnector());

        // same dialog will be used for each address test. Any message just returns the user name from the 
        // message address
        const PROMPT_RESPONSE = 'response will be user data';
        const data = 'some data';
        bot.dialog('/', [
            (session) => Prompts.text(session, PROMPT_RESPONSE),
            (session, res) => {
                session.userData = { data: res.response };
                session.endConversation('end');
            }
        ]);

        const botTester = testSuiteBuilder(bot);

        bot.use({

            botbuilder: (session, next) => {
                session.send('hey')
                next();
            },
            send: (e, next) => {
                next();
            }
        })

        executeDialogTest = botTester.executeDialogTest;
        SendMessageToBotDialogStep = botTester.SendMessageToBotDialogStep;
        InspectSessionDialogStep = botTester.InspectSessionDialogStep;

        return executeDialogTest([
            new SendMessageToBotDialogStep('hello', ['hey', PROMPT_RESPONSE]),
            new InspectSessionDialogStep((session) => {
                // expect(session.userData.data).to.equal(data);
                console.log('doing this check now');
            }),
            new SendMessageToBotDialogStep(data, ['hey', 'end']),
            new InspectSessionDialogStep((session) => {
                expect(session.userData.data).to.equal(data);
            })
        ]);
    });

    it('example failure case', () => {
        return executeDialogTest([
            new SendMessageToBotDialogStep(
                promptDialog.USER_MESSAGE_TO_TRIGGER,
                "oh dear, this is definitely baaaad "),
            new SendMessageToBotDialogStep(
                promptDialog.EXPECTED_USER_MESSAGE_RESPONSE,
                [promptDialog.BOT_ECHO_USER_RESPONSE, promptDialog.BOT_LAST_MESSAGE])
        ]).catch(chai.AssertionError, e => {
            // do nothing, this is the expected state
        })
    })

    it('run example for echo dialog', () => {
        return executeDialogTest([
            new SendMessageToBotDialogStep(
                echoDialog.USER_MESSAGE_TO_TRIGGER,
                echoDialog.USER_MESSAGE_TO_TRIGGER),
            new SendMessageToBotDialogStep(
                "How are you doing?",
                "How are you doing?"),
            new SendMessageToBotDialogStep(
                "Why do you keep copying me?",
                "Why do you keep copying me?"),
            new SendMessageToBotDialogStep(
                "Will you even plagerize my spelling errors??",
                "Will you even plagerize my spelling errors??"),
            new SendMessageToBotDialogStep(
                echoDialog.USER_MESSAGE_TO_END,
                echoDialog.BOT_LAST_MESSAGE),
        ]);
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
            const bot =  new UniversalBot(new ConsoleConnector());

            // same dialog will be used for each address test. Any message just returns the user name from the 
            // message address
            bot.dialog('/', (session) => session.send(session.message.address.user.name));

            // Default address can be set when building the test components
            const botTester = testSuiteBuilder(bot, defaultAddress);

            executeDialogTest = botTester.executeDialogTest;
            SendMessageToBotDialogStep = botTester.SendMessageToBotDialogStep;
            InspectSessionDialogStep = botTester.InspectSessionDialogStep;

        })

        it('Can ensure proper address being used for return', () => {
            // SendMessageToBotDialogStep can accept botbuilder messages!
            const askForUser1Name = new Message()
                .text('What is my name?')
                .address(defaultAddress)
                .toMessage();
            
            const expectedAddressInMessage = new Message()
                .address(defaultAddress)
                .toMessage();

            // partial addresses work as well (i.e. if you only want to check one field such as userId)
            const expectedPartialAddress = new Message()
                .address({
                    user: {
                        id: 'user1'
                    }
                } as IAddress)
                .toMessage();


            return executeDialogTest([
                new SendMessageToBotDialogStep(askForUser1Name, expectedAddressInMessage),
                new SendMessageToBotDialogStep(askForUser1Name, expectedPartialAddress),
            ]);  
        });

        // the bot can have a default address that messages are sent to. If needed, this address can always be overriden
        it('Can have a default address assigned to it', () => {
            const askForUser1Name = new Message()
                .text('What is my name?')
                .address(defaultAddress)
                .toMessage();
            
            const askForUser2Name = new Message()
                .text('What is my name?')
                .address(user2Address)
                .toMessage();

            // when testing for an address that is not the default for the bot, the address must be passed in
            return executeDialogTest([
                new SendMessageToBotDialogStep(askForUser1Name, 'A'),
                new SendMessageToBotDialogStep(askForUser1Name, 'A', defaultAddress),
                new SendMessageToBotDialogStep(askForUser2Name, 'B', user2Address)
            ]); 
        })

        it('Can communicate to multiple users', () => {
            const askForUser1Name = new Message()
                .text('What is my name?')
                .address(defaultAddress)
                .toMessage();
            
            const askForUser2Name = new Message()
                .text('What is my name?')
                .address(user2Address)
                .toMessage();

            // when testing for an address that is not the default for the bot, and only providing a string for a response, 
            // an expected address can be appended as a third argument
            return executeDialogTest([
                new SendMessageToBotDialogStep(askForUser1Name, 'A'),
                new SendMessageToBotDialogStep(askForUser1Name, 'A', defaultAddress),
                new SendMessageToBotDialogStep(askForUser2Name, 'B', user2Address)
            ]);
        })
    });
});