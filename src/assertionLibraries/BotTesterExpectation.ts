import { IConfig } from './../config';
import { AssertionLibrary } from './AssertionLibrary';
import { AvaExpectation } from './AvaExpectation';
import { ChaiExpectation } from './ChaiExpectation';
import { IExpectation } from './IExpectation';

export type expectationFunction = (subject: {}, message?: string) => IExpectation;

export class BotTesterExpectation {
    private readonly config: IConfig;

    constructor(config: IConfig) {
        this.config = config;
    }

    public expect(subject: {}, message?: string): IExpectation {
        switch (this.config.assertionLibrary) {
            case AssertionLibrary.AVA:
                // throw new Error('ava is not yet supported');
                return new AvaExpectation(this.config.testContext, subject, message);
            case AssertionLibrary.CHAI:
            default:
                return new ChaiExpectation(subject, message);
        }
    }
}
