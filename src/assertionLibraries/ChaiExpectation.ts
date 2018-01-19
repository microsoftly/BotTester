import { IAttachment, IMessage } from 'botbuilder';
import * as chai from 'chai';
import { IExpectation } from './IExpectation';

// importing with ts method breaks compilation, use require
//tslint:disable
const chaiSubset = require('chai-subset');
//tslint:enable

chai.use(chaiSubset);

const expect = chai.expect;

type DeepMatchReturn = { to: {
    deep: {
        match(arg: {}): {}
    }
}};

// type hack to get the ts to be happy
type DeepMatch = (args: {}, errMsg?: string) => DeepMatchReturn;


//tslint:disable
const expectWithDeepMatch: DeepMatch = expect as any;

/**
 * Expectations for chai based frameworks
 */
export class ChaiExpectation implements IExpectation {
    private subject: {};
    private message: string;

    constructor(subject: {}, message?: string) {
        this.subject = subject;
        this.message = message;
    }

    public notToBeEmpty(): void {
        expect(this.subject, this.message).not.to.be.empty;
    }

    public toEqual(value: {}): void {
        expect(this.subject, this.message).to.equal(value);
    }

    public toInclude(value: {}): void {
        expect(this.subject, this.message).to.include(value);
    }

    public toBeTrue(): void {
        expect(this.subject, this.message).to.be.true;
    }

    /**
     * deeply compares an outgoing message with the expected messages that are considered valid for this test to pass.
     * It does a subset comparison, so as long as the expected message is a subset of one of the expected responses, this will pass
     *
     * @param outgoingMessage actual message that bot sends
     */
    public toDeeplyInclude(outgoingMessage: IMessage): void {
        const expectedResponseCollectionAsIMessage: IMessage[] = this.subject as IMessage[];
        // tslint:disable
        const expectWithDeepMatch: DeepMatch = expect as any;
        // tslint:enable

        let matchExists = false;

        expectedResponseCollectionAsIMessage.forEach((expectedResponse: IMessage) => {
            const exp = expect;
            if (matchExists) {
                return;
            }

            const outgoingMessageClone = Object.assign({}, outgoingMessage);
            const expectedResponseClone = Object.assign({}, expectedResponse);

            // attachments are compared separately
            const outgoingMessageAttachments = outgoingMessageClone.attachments || [];
            const expectedResponseAttachments = expectedResponseClone.attachments || [];

            outgoingMessageClone.attachments = [];
            expectedResponseClone.attachments = [];

            // ignore source event (not added to message until after sending)
            delete expectedResponseClone.source;

            // auto added by prompts, not needed
            delete outgoingMessageClone.inputHint;

            // always botbuilder
            delete expectedResponseClone.agent;

            try {
                expect(outgoingMessageClone).to.containSubset(expectedResponseClone);
                matchExists = true;

                if (matchExists && expectedResponseAttachments.length) {
                    matchExists = this.checkForMatchingAttachments(outgoingMessageAttachments, expectedResponseAttachments);
                }
            } catch (e) {
                // continue, no match found
            }
        });

        if (!matchExists) {
            expect.fail(null, null, `expected ${JSON.stringify(outgoingMessage)}\
            to be a subset of one of ${JSON.stringify(expectedResponseCollectionAsIMessage, null, 2)}`);
        }
    }

    private checkForMatchingAttachments(outgoingAttachments: IAttachment[], expectedAttachments: IAttachment[]): boolean {
        let matchExists: boolean = false;

        outgoingAttachments.forEach((outgoingAttachment: IAttachment) => {
            if (matchExists) {
                return;
            }

            expectedAttachments.forEach((expectedAttachment: IAttachment) => {
                if (matchExists) {
                    return;
                }

                try {
                    expect(outgoingAttachment).to.containSubset(expectedAttachment);

                    matchExists = true;
                } catch (e) {
                    // continue
                }
            });
        });

        return matchExists;
    }
}
