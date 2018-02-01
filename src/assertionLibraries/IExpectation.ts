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
