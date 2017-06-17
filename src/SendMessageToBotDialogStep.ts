import * as chai from 'chai';
import * as Promise from 'bluebird';
import IDialogTestStep from './IDialogTestStep';
import { UniversalBot, IMessage, Message, IAddress } from 'botbuilder';

const expect = chai.expect;

export default (sendMessageToBot: (message: IMessage | string, address?: IAddress) => any,
                setBotToUserMessageChecker: (newMessageChecker: (text: string, address: IAddress) => any) => any,
                defaultAddress?: IAddress) => 
    class SendMessageToBotDialogStep implements IDialogTestStep {
        private message: IMessage;
        private expectedResponses: [string];
        
        // for now, let the response only be in the form of a string. It can be abstracted later
        constructor(msg: IMessage | string, expectedResponses?: string | string[], address?: IAddress) {
            address = address || defaultAddress;

            if(typeof(msg) === "string" && !defaultAddress && !address) {
                throw new Error('if message is a string, an address must be provided');
            }

            if(address) {
                const text = msg as string;
                this.message = new Message()
                    .text(text)
                    .address(address)
                    .timestamp()
                    .toMessage();
            } else {
                this.message = msg as IMessage;
            }

            if(typeof(expectedResponses) === 'string') {
                expectedResponses = [expectedResponses];
            }

            // allow undef if it is not provided
            this.expectedResponses = expectedResponses && expectedResponses as [string];
        }

        execute() {
            return new Promise((res, rej) => {
                setBotToUserMessageChecker((text: string, address: IAddress) => {
                    if(!this.expectedResponses) return res();

                    const currentExpectedResponse = this.expectedResponses.shift();
                    try {
                        expect(text, `Bot should have responded with '${currentExpectedResponse}', but was '${text}`)
                            .to.be.equal(currentExpectedResponse);
                    } catch(e) {
                        return rej(e);
                    }

                    if(!this.expectedResponses.length) {    
                        res();
                    }
                });

                sendMessageToBot(this.message);
            });
        }
    } 