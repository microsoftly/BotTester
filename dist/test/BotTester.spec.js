"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/index");
const echoDialog = require("./testBot/echoDialog");
const promptDialog = require("./testBot/promptDialog");
const setUserDataDialog = require("./testBot/setUserDataDialog");
const createTestBot_1 = require("./testBot/createTestBot");
const chai = require("chai");
const expect = chai.expect;
const address = { channelId: 'console',
    user: { id: 'user1', name: 'user1' },
    bot: { id: 'bot', name: 'Bot' },
    conversation: { id: 'user1Conversation' } };
describe('Bot Tester Example Use', () => {
    let executeDialogTest;
    let SendMessageToBotDialogStep;
    let InspectSessionDialogStep;
    beforeEach(() => {
        const bot = createTestBot_1.default();
        const botTester = index_1.default(bot, address);
        executeDialogTest = botTester.executeDialogTest;
        SendMessageToBotDialogStep = botTester.SendMessageToBotDialogStep;
        InspectSessionDialogStep = botTester.InspectSessionDialogStep;
    });
    it('run example for prompt dialog', () => {
        return executeDialogTest([
            new SendMessageToBotDialogStep(promptDialog.USER_MESSAGE_TO_TRIGGER, promptDialog.BOT_PROMPT_MESSAGE),
            new SendMessageToBotDialogStep(promptDialog.EXPECTED_USER_MESSAGE_RESPONSE, [promptDialog.BOT_ECHO_USER_RESPONSE, promptDialog.BOT_LAST_MESSAGE])
        ]);
    });
    it.only('can inspect session', () => {
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
            new SendMessageToBotDialogStep(promptDialog.USER_MESSAGE_TO_TRIGGER, "oh dear, this is definitely baaaad "),
            new SendMessageToBotDialogStep(promptDialog.EXPECTED_USER_MESSAGE_RESPONSE, [promptDialog.BOT_ECHO_USER_RESPONSE, promptDialog.BOT_LAST_MESSAGE])
        ]).catch(chai.AssertionError, e => {
            // do nothing, this is the expected state
        });
    });
    it('run example for echo dialog', () => {
        return executeDialogTest([
            new SendMessageToBotDialogStep(echoDialog.USER_MESSAGE_TO_TRIGGER, echoDialog.USER_MESSAGE_TO_TRIGGER),
            new SendMessageToBotDialogStep("How are you doing?", "How are you doing?"),
            new SendMessageToBotDialogStep("Why do you keep copying me?", "Why do you keep copying me?"),
            new SendMessageToBotDialogStep("Will you even plagerize my spelling errors??", "Will you even plagerize my spelling errors??"),
            new SendMessageToBotDialogStep(echoDialog.USER_MESSAGE_TO_END, echoDialog.BOT_LAST_MESSAGE),
        ]);
    });
});
//# sourceMappingURL=BotTester.spec.js.map