import * as Promise from 'bluebird';
import { IAddress, IMessage, Message, UniversalBot} from 'botbuilder';
import * as chai from 'chai';
import { IDialogTestStep } from './IDialogTestStep';

const expect = chai.expect;

export function SendMessageToBotDialogStepClassCreator(
    sendMessageToBot: (message: IMessage | string, address?: IAddress) => any,
    setBotToUserMessageChecker: (newMessageChecker: (msg: IMessage | IMessage[]) => any) => any,
    defaultAddress?: IAddress) {
    return class SendMessageToBotDialogStep implements IDialogTestStep {
        private message: IMessage;
        private expectedResponses: string[][];

        // for now, let the response only be in the form of a string. It can be abstracted later
        constructor(
            msg: IMessage | string,
            expectedResponses?: string | string[] | string[][],
            address?: IAddress
        ) {
            address = address || defaultAddress;

            if (typeof(msg) === 'string' && !defaultAddress && !address) {
                throw new Error('if message is a string, an address must be provided');
            }

            if (typeof(msg) === 'string') {
                const text = msg as string;
                this.message = new Message()
                    .text(text)
                    .address(address)
                    .timestamp()
                    .toMessage();
            } else {
                this.message = msg as IMessage;
            }

            if (typeof(expectedResponses) === 'string') {
                expectedResponses = [[expectedResponses]];
            } else if (expectedResponses instanceof Array) {
                if (expectedResponses.length > 0 && typeof(expectedResponses) === 'string') {
                    expectedResponses = [expectedResponses];
                }
            }

            // allow undef if it is not provided
            this.expectedResponses = expectedResponses && expectedResponses as string[][];
        }

        public execute(): Promise {
            return new Promise((res: () => void, rej: (error: Error) => void) => {
                setBotToUserMessageChecker((messages: IMessage | IMessage[]) => {
                    if (!this.expectedResponses) {
                        return res();
                    }

                    if (!(messages instanceof Array)) {
                        messages = [messages];
                    }

                    messages.forEach((msg: IMessage) => {
                        if (msg.type === 'save') {
                            return res();
                        }

                        const currentExpectedResponse = this.expectedResponses.shift();
                        try {
                            const errorString = `Bot should have responded with '${currentExpectedResponse}', but was '${msg.text}`;
                            expect(currentExpectedResponse, errorString).to.include(msg.text);
                        } catch (e) {
                            return rej(e);
                        }

                    });

                    if (!this.expectedResponses.length) {
                        res();
                    }
                });

                sendMessageToBot(this.message);
            });
        }
    };
}
