import * as Promise from 'bluebird';

interface IDialogTestStep {
    execute(): Promise<any>
};

export default IDialogTestStep;
