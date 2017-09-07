import { ChaiExpectation } from './ChaiExpectation';

/**
 * framework based extractions. New frameworks will implement this interface to be able to be used seamlessly within the framework
 */
export interface IExpectation {
    notToBeEmpty(): void;
    toEqual(value: {}): void;
    toInclude(value: {}): void;
    toBeTrue(): void;
    toDeeplyInclude(value: {}): void;
}

/**
 * Creates a wrapper instance around an assertion class
 *
 * @param subject object being tested against
 * @param message error message to print if expectation fails
 */
export function expect(subject: {}, message?: string): IExpectation {
    return createExpectation(subject, message);
}

function createExpectation(subject: {}, message?: string): IExpectation {
    const name = 'chai';

    switch (name) {
        case 'chai':
            return new ChaiExpectation(subject);
        default:
            return new ChaiExpectation(subject);
    }
}
