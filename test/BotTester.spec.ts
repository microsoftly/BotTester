import 'mocha';
import BotTester from '../src/index';
import * as echoDialog from './testBot/echoDialog';
import * as promptDialog from './testBot/promptDialog';
import * as setUserDataDialog from './testBot/setUserDataDialog';
import createTestBot from './testBot/createTestBot';
import * as chai from 'chai';

const expect = chai.expect

const address =  { channelId: 'console',
    user: { id: 'user1', name: 'user1' }, 
    bot: { id: 'bot', name: 'Bot' },
    conversation: { id: 'user1Conversation' } };

describe('Bot Tester Example Use', () => {
    let executeDialogTest;
    let SendMessageToBotDialogStep;
    let InspectSessionDialogStep;
    let sendMessageToBot;

    beforeEach(() =>  {
        const bot =  createTestBot();
        const botTester = BotTester(bot, address);

        executeDialogTest = botTester.executeDialogTest;
        SendMessageToBotDialogStep = botTester.SendMessageToBotDialogStep;
        InspectSessionDialogStep = botTester.InspectSessionDialogStep;
        sendMessageToBot = botTester.sendMessageToBot;
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

    it('can inspect session', () => {
        const data = "this is data";

        return executeDialogTest([
            new SendMessageToBotDialogStep(
                setUserDataDialog.USER_MESSAGE_TO_TRIGGER, 
                setUserDataDialog.BOT_PROMPT),
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
});