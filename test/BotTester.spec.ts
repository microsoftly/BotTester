import { ConsoleConnector, Message, UniversalBot } from 'botbuilder';
import * as chai from 'chai';
import { BotTester } from '../src/BotTester';
import { createTestBot } from './testBot/createTestBot';
import { COLORS, GIVE_RANDOM_COLOR_TRIGGER } from './testBot/createTestBot';
import * as echoDialog from './testBot/echoDialog';
import * as promptDialog from './testBot/promptDialog';
import * as setUserDataDialog from './testBot/setUserDataDialog';


const expect = chai.expect;

describe('Bot Tester Example Use', () => {
    let executeDialogTest;

    // tslint:disable
    let SendMessageToBotDialogStep;
    let InspectSessionDialogStep;
    // tslint:disable

    beforeEach(() =>  {
        const bot =  createTestBot();
        const botTester = BotTester(bot);

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
            return new executeDialogTest([
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

    it('Can ensure proper address being used for return', () => {
        const localBot = new UniversalBot(new ConsoleConnector());

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

        localBot.dialog('/', (session) => session.send(session.message.address.user.name));

        const botTester = BotTester(localBot);

        // sendMessageToBotDialogStep can accept botbuilder messages!
        const askForUser1Name = new Message()
            .text('What is my name?')
            .address(user1Address)
            .toMessage();
        
        const expectedAddressInMessage = new Message()
            .address(user1Address)
            .toMessage();


        return botTester.executeDialogTest([
            new botTester.SendMessageToBotDialogStep(askForUser1Name, expectedAddressInMessage),
        ]);  
    });

    it('Can communicate to multiple users', () => {
        const localBot = new UniversalBot(new ConsoleConnector());

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

        localBot.dialog('/', (session) => session.send(session.message.address.user.name));

        const botTester = BotTester(localBot);

        // sendMessageToBotDialogStep can accept botbuilder messages!
        const askForUser1Name = new Message()
            .text('What is my name?')
            .address(user1Address)
            .toMessage();
        
        const askForUser2Name = new Message()
            .text('What is my name?')
            .address(user2Address)
            .toMessage();


        return botTester.executeDialogTest([
            new botTester.SendMessageToBotDialogStep(askForUser1Name, 'A'),
            new botTester.SendMessageToBotDialogStep(askForUser2Name, 'B')
        ]);
    })
});