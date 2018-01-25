import { IConfig } from './../config';
import { AssertionLibrary } from './AssertionLibrary';
import { ChaiExpectation } from './ChaiExpectation';
import { IExpectation } from './IExpectation';

export type expectationFunction = (subject: {}, message?: string) => IExpectation;

export class BotTesterExpectation {
    private readonly assertionLibrary: AssertionLibrary;

    constructor(config: IConfig) {
        this.assertionLibrary = config.assertionLibrary;
    }

    public expect(subject: {}, message?: string): IExpectation {
        switch (this.assertionLibrary) {
            case AssertionLibrary.AVA:
                throw new Error('ava is not yet supported');
            case AssertionLibrary.CHAI:
            default:
                return new ChaiExpectation(subject, message);
        }
    }
}
