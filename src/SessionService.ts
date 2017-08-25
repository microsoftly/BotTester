import * as Promise from 'bluebird';
import { IAddress, IMessage, Message, Session, UniversalBot } from 'botbuilder';

interface ISaveUpdatableSession extends Session {
    saveUpdated: boolean;
}

export class SessionService {
    private bot: UniversalBot;
    private currentSessionLoadResolver: (s: Session) => void;
    //tslint:disable
    private savePerformed: Promise<any>;
    //tslint:enable

    constructor(bot: UniversalBot) {
        this.bot = bot;
        this.applySessionSaveListener();
        this.applySessionLoadListener();
        this.savePerformed = Promise.resolve();
    }

    public getSession(addr: IAddress): Promise<Session> {
        return new Promise<Session>((res: (s: Session) => void, rej: Function) => {
            this.createSessionWrapperWithLoadMessageOverride(addr);

            this.currentSessionLoadResolver = res;

            this.loadSession(addr);
        }).bind(this);
    }

    public getInternalSaveMessage(address: IAddress): IMessage {
        const saveEvent = new Message()
            .address(address)
            .toMessage();

        saveEvent.type = 'save';

        return saveEvent;
    }

    private createSessionWrapperWithLoadMessageOverride(addr: IAddress): void {
        // This is a delicate hack that relies on knowing the private fields of a UniversalBot
        // The net effect is calling createSessio n with a message of type 'load' that gets
        // handled in the BotTester interception middleware (see applySessionLoadListener)
        // tslint:disable
        const createSessionOriginal: Function = this.bot['createSession'];

        this.bot['createSession'] = function() {
            //tslint:enable
            const createSessionArgs: {}[] = Array.prototype.slice.call(arguments);

            const loadMsg = new Message()
                .address(addr)
                .toMessage();

            loadMsg.type = 'load';

            createSessionArgs[1] = loadMsg;

            //tslint:disable
            this.bot['createSession'] = createSessionOriginal;

            createSessionOriginal.apply(this.bot, createSessionArgs);
        }.bind(this);
    }

    // loads session immediately, or waits for previous save request to finish before loading
    private loadSession(addr: IAddress): void {
        this.savePerformed
            .then(() => {
                //tslint:disable
                // this callback will never actually get called, but it sets off the events allowing
                // for the encapsulating promise to resolve
                this.bot.loadSession(addr, (a) => {});
                //tslint:enable
            });
    }

    private applySessionLoadListener(): void {
        this.bot.use({
            botbuilder: (session: Session, next: Function) => {
                if (session.message.type === 'load') {
                    //tslint:disable
                    // its not actually supposed to be in the middleware, so unset this
                    session['inMiddleware'] = false;
                    //tslint:enable
                    this.currentSessionLoadResolver(session);
                } else {
                    next();
                }
            }
        });
    }

    private applySessionSaveListener(): void {
        // routing is where after session.save is called. We're hihacking it to add our meta save function that will send the
        // messageReceivedHandler an event of type "save". This allows the test runner to continue the serial promise
        // execution even if a message is not explicitly returned to the user but session state is saved. Note that saving
        // session and sending a message back to the user in one dialog step will cause an error, but is also bad practice.
        // every time a message is sent to a user, session is saved implicitly.

        // this is a critical hack that attaches an extra field onto session. Gonna just ignore this lint issue for now
        this.bot.on('routing', (session: ISaveUpdatableSession) => {
        // tslint:enable
            if (!session.saveUpdated ) {
                session.saveUpdated = true;

                const saveEvent = this.getInternalSaveMessage(session.message.address);

                const save = session.save.bind(session);
                session.save = function(): Session {
                    save();

                    session.send(saveEvent);

                    // ensure that the state is saved before any session loading occurs (if use calls getSession, we want it to
                    // load only after the session state is saved)
                    this.savePerformed = Promise.promisify(session.sendBatch).call(session);

                    return session;
                };
            }
        });
    }
}
