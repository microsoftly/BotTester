import * as Promise from 'bluebird';
import { IAddress, IMessage, Message, Session, UniversalBot } from 'botbuilder';

interface ISaveUpdatableSession extends Session {
    saveUpdated: boolean;
}

/**
 * Service that provides session for addresses. Injects code into a Universal bot to allow session save and load listeners to work
 */
export class SessionService {
    private bot: UniversalBot;
    private currentSessionLoadResolver: (s: Session) => void;
    /**
     * This is a crucial field to proper serial execution of the BotTester framework. session.save occurs asynchronously in UniversalBot
     * batch executions. We do not want to be able to load a session if session.save has been called, but the bot's batch has yet to
     * execute. This promise will be set to resolved when the bot's latest batch has finished, should the framework be watching for a save
     * call. This value is defaulted to a resolved promise.
     */
    //tslint:disable
    private savePerformed: Promise<any>;
    //tslint:enable

    constructor(bot: UniversalBot) {
        this.bot = bot;
        this.applySessionSaveListener();
        this.applySessionLoadListener();
        this.savePerformed = Promise.resolve();
    }

    /**
     * fetches a session for a particular address
     *
     * @param addr address of session to load
     */
    public getSession(addr: IAddress): Promise<Session> {
        return new Promise<Session>((res: (s: Session) => void, rej: Function) => {
            this.createSessionWrapperWithLoadMessageOverride(addr);

            this.currentSessionLoadResolver = res;

            this.loadSession(addr);
        }).bind(this);
    }

    /**
     * a message internal to the BotTester framework. Due limitations in the botbuilder framework, this message is sent to the bot whenever
     * session.save is called. This allows the framework to know when session.save is called and resolve accordingly. Without this, the
     * session state may not be persisted before the next test step is run
     * @param address address that the save message should come from
     */
    public getInternalSaveMessage(address: IAddress): IMessage {
        const saveEvent = new Message()
            .address(address)
            .toMessage();

        saveEvent.type = '__save__';

        return saveEvent;
    }

    /**
     * This is a delicate hack that relies on accessing and modifying the private field createSession on UniversalBot.
     * This makes the bot's next createSession call result in a session with a message of type 'load'. This allows the sessionLoadListener
     * to know if a message that the bot thinks it received was actually the result of a call to bot.createSession
     * @param addr address of the message that is being loaded
     */
    private createSessionWrapperWithLoadMessageOverride(addr: IAddress): void {
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

    /**
     * Loads a session associated with an address. 
     * @param address address to be loaded
     */
    private loadSession(address: IAddress): void {
        this.savePerformed
            .then(() => {
                //tslint:disable
                // this callback will never actually get called, but it sets off the events allowing
                // for the encapsulating promise to resolve
                this.bot.loadSession(address, (a) => {});
                //tslint:enable
            });
    }

    /**
     * adds middleware to the bot that checks for incoming load messages sent by createSessionWrapperWithLoadMessageOverride's
     * bot.createSession wrapper. This lets us know that the message was never meant to go through the bot's middelware and ignore it.
     * The session loaded into this message is then used as the value that the Promise returned from getSession resolves to
     */
    private applySessionLoadListener(): void {
        this.bot.use({
            botbuilder: (session: Session, next: Function) => {
                // TODO add in address comparison with address encoded in createSessionWrapperWithLoadMessageOverride's wrapper to
                // createSession
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

    /**
     * Adds a routing event listner which is the first execution path called after a session has been successfully loaded. If this session
     * has not already gone through this listener, then it wraps session.save in a function that sends the internal save message that is
     * mocked to be sent to the user, and thereby intercepted by the MessageService. This ensures that the test runner does not continue
     * preemptively. When the session's save method is called, the message is actually sent and alerts the BotTester framework
     */
    private applySessionSaveListener(): void {
        // this is a critical hack that attaches an extra field onto session. Gonna just ignore this lint issue for now
        this.bot.on('routing', (session: ISaveUpdatableSession) => {
        // tslint:enable
            // if session.saveUpdated === true, then we should ignore this session being routed because it has already had its save method
            // hijacked
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
