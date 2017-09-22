
import { IAddress, IConnector, IEvent, IMessage, Message } from 'botbuilder';

export class TestConnector implements IConnector {
    private onEventHandler: (events: IEvent[], cb?: (err: Error) => void) => void;
    private onInvokeHandler: (event: IEvent, cb?: (err: Error, body: {}, status?: number) => void) => void;
    private newConvoCount: number;

    constructor() {
        this.newConvoCount = 0;
    }

    public onEvent(handler: (events: IEvent[], cb?: (err: Error) => void) => void): void {
        this.onEventHandler = handler;
    }

    public send(messages: IMessage[], done: (err: Error, addresses?: IAddress[]) => void): void {
        done(null, messages.map((m: IMessage) => m.address));
    }

    public startConversation(address: IAddress, cb: (err: Error, address?: IAddress) => void): void {
        const adr = Object.assign({}, address);
        adr.conversation = { id: `Convo${this.newConvoCount++}` };
        cb(null, adr);
    }
}
