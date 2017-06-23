import * as Promise from 'bluebird';
import { IAddress, Session } from 'botbuilder';
import { IDialogTestStep } from './IDialogTestStep';

export function InspectSessionDialogStepClassCreator(getSession: (addr: IAddress) => Promise<Session>, defaultAddress: IAddress) {
    return class InspectSessionDialogStep implements IDialogTestStep {
        private address: IAddress;
        private sessionInspector: (session: Session) => any;

        constructor(
            sessionInspector: (session: Session) => any,
            address?: IAddress
        ) {
            if (!address && !defaultAddress) {
                throw new Error('InspectSessionDialogStep requires a default address or an address be provided')
            }

            this.address = address || defaultAddress;
            this.sessionInspector = sessionInspector;
        }

        public execute(): Promise<any> {
            return getSession(this.address)
                .then(this.sessionInspector);
        }
    };
}
