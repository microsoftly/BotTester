import * as Promise from 'bluebird';
import { IAddress, Session } from 'botbuilder';
import { IDialogTestStep } from './IDialogTestStep';

export type curriedInspectSessionDialogStepConstructor = new (sessionInspector: (session: Session) => any, address?: IAddress) => InspectSessionDialogStep;

export class InspectSessionDialogStep implements IDialogTestStep {
    private sessionInspector: (session: Session) => any;
    private getSession: (addr: IAddress) => Promise<Session>;
    private address: IAddress;

    constructor(
        // use bind to hide these away from end user
        getSession: (addr: IAddress) => Promise<Session>,
        defaultAddress: IAddress,

        sessionInspector: (session: Session) => any,
        address?: IAddress
    ) {
        this.getSession = getSession;
        this.address = address || defaultAddress;
        this.sessionInspector = sessionInspector;
    }

    public execute(): Promise<any> {
        return this.getSession(this.address)
            .then(this.sessionInspector);
    }
}

export function InspectSessionDialogStepClassCreator(
    getSession: (addr: IAddress) => Promise<Session>,
    defaultAddress: IAddress
    ): curriedInspectSessionDialogStepConstructor {

    return InspectSessionDialogStep.bind(null, getSession, defaultAddress);
}
