import * as chai from 'chai';
import * as chaiSamSam from 'chai-samsam';
import { Expectation } from './Expectation';

// chai.use(chaiSamSam);/
type DeepMatchReturn = { to: {
    deep: {
        match(arg: {}): {}
    }
}};

// type hack to get the ts to be happy
type DeepMatch = (args: {}, errMsg?: string) => DeepMatchReturn;

export class ChaiExpectation implements Expectation {
  private chaiModule: typeof chai;

  constructor(private subject: {}, private message?: string) {
    this.chaiModule = require('chai');
  }

  public notToBeEmpty() {
    this.chaiModule.expect(this.subject, this.message).not.to.be.empty;
  }

  public toEqual(value: {}) {
    this.chaiModule.expect(this.subject, this.message).to.equal(value);
  }

  public toInclude(value: {}) {
    this.chaiModule.expect(this.subject, this.message).to.include(value);
  }

  public toBeTrue() {
    this.chaiModule.expect(this.subject, this.message).to.be.true;
  }

  public toDeeplyInclude(value: {}) {
    const expectWithDeepMatch: DeepMatch = this.chaiModule.expect as any;

    expectWithDeepMatch(this.subject).to.deep.match(value);
  }
}
