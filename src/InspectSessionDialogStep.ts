import { IDialogTestStep } from './IDialogTestStep';
import { IAddress, Session } from 'botbuilder';

export default (getSession: (addr: IAddress) => Promise<Session>, defaultAddress: IAddress) => 
    class InspectSessionDialogStep implements IDialogTestStep {
        private address: IAddress;
        private sessionInspector: (session: Session) => any;

        constructor(
            sessionInspector: (session: Session) => any, 
            address?: IAddress
        ) {
            if(!address && !defaultAddress) {
                throw new Error('InspectSessionDialogStep requires a default address or an address be provided')
            }

            this.address = address || defaultAddress;
            this.sessionInspector = sessionInspector;
        }

        execute() {
            return getSession(this.address)
                .then(this.sessionInspector);
        }
    }