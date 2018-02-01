import { IAddress, IMessage } from 'botbuilder';
import * as fs from 'fs';
import { AssertionLibrary } from './assertionLibraries/AssertionLibrary';
import { ignoreInternalSaveMessageFilter } from './builtInMessageFilters';

/**
 * Returns true if a message
 */
export type MessageFilter = (message: IMessage) => boolean;

export interface IConfig {
    /**
     * assertion library to use when running the tests. Valid libraries/strings/values are:
     *  1) chai
     *
     * chai is the default library if none is provided
     * libraries being developed:
     *  1) Ava
     *
     * to request support for a new assertion library, check this thread and submit a comment
     */
    assertionLibrary?: AssertionLibrary | string;
    /**
     * timeout in milliseconds before a BotTester runner will fail a test (when not overriden)
     */
    timeout?: number;
    /**
     * default address bot will use for all communication (when not overriden)
     */
    defaultAddress?: IAddress;

    /**
     * ignores typing event messages
     */
    ignoreTypingEvent?: boolean;

     /**
      * ignores end of conversation event messages
      */
    ignoreEndOfConversationEvent?: boolean;

    /**
     * ignores the internal __save__ message. Setting this to true will cause checkSession to hang and test to fail
     */
    // this is explicitly not added as a chained builder function to disaude consumers from using this.
    ignoreInternalSaveMessage?: boolean;

    /**
     * filters for messages that the BotTester framework should use
     */
    messageFilters?: MessageFilter[];

    /**
     * For internal use only. This allows the test context to be passed down to the assertion library implementation
     */
    //tslint:disable
    __internal__testContext?: any;
    //tslint:enable
}

const configFilePath = `bot-tester.json`;

/**
 * default value for timeout. If config/options are set to this value, no timeout will be used
 */
export const NO_TIMEOUT = -1;

const defaultConfig: IConfig = {
    timeout: NO_TIMEOUT,
    assertionLibrary: AssertionLibrary.CHAI,
    defaultAddress: {
        channelId: 'console',
        user: { id: 'user1', name: 'user1' },
        bot: { id: 'bot', name: 'Bot' },
        conversation: { id: 'user1Conversation' }
    }
};

export function getConfig(): IConfig {
    let configInternal: IConfig;

    if (configInternal) {
        return configInternal;
    }

    configInternal = defaultConfig;

    const configFileExists = fs.existsSync(configFilePath);

    if (configFileExists) {
        configInternal = JSON.parse(fs.readFileSync(configFilePath, { encoding: 'utf8' }));
        configInternal.timeout = configInternal.timeout || NO_TIMEOUT;
    }

    configInternal.messageFilters = [];

    configInternal.assertionLibrary = configInternal.assertionLibrary || AssertionLibrary.CHAI;

    if (configInternal.ignoreInternalSaveMessage) {
        configInternal.messageFilters.push(ignoreInternalSaveMessageFilter);
    }

    return configInternal;
}
