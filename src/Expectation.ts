import { ChaiExpectation } from './ChaiExpectation';

type SUPPORTED_FRAMEWORKS = 'chai';

export interface Expectation {
  notToBeEmpty();
  toEqual(value: {});
  toInclude(value: {});
  toBeTrue();
  toDeeplyInclude(value: {});
}

export function expect(subject: {}, message?: string): Expectation {
  return createExpectation(subject, message);
}

function createExpectation(subject: {}, message?: string): Expectation {
  const name = 'chai';

  switch (name) {
    case 'chai':
      return new ChaiExpectation(subject);
  }
}
