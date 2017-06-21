const mocha = require('mocha');
const builder = require('botbuilder');
const BotTester = require('../dist/src').default;
const { expect } = require('chai');

const connector = new builder.ConsoleConnector();

describe('BotTester Usage', () => {
    let bot;

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
}) 

