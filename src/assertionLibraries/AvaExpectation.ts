import { TestContext } from 'ava';
import { IMessage } from 'botbuilder';
import { ChaiExpectation } from './ChaiExpectation';
import { IExpectation } from './IExpectation';

export class AvaExpectation implements IExpectation {
    private subject: {};
    private message: string;
    private readonly chaiImplementation: ChaiExpectation;
    private readonly avaContext: TestContext;

    constructor(avaContext: TestContext, subject: {}, message?: string) {
        this.subject = subject;
        this.message = message;
        this.chaiImplementation = new ChaiExpectation(subject, message);
        this.avaContext = avaContext;
    }

    public notToBeEmpty(): void {
        this.chaiImplementation.notToBeEmpty();

        this.avaContext.pass();
    }

    public toEqual(value: {}): void {
        this.avaContext.is(this.subject, value);
    }

    public toInclude(value: {}): void {
        this.chaiImplementation.toInclude(value);

        this.avaContext.pass();
    }

    public toBeTrue(): void {
        this.chaiImplementation.toBeTrue();

        this.avaContext.pass();
    }

    public toDeeplyInclude(value: IMessage): void {
        this.chaiImplementation.toDeeplyInclude(value);

        this.avaContext.pass();
    }
}
