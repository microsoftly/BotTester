import { IAddress } from 'botbuilder';
import * as fs from 'fs';

export interface IConfig {
    /**
     * timeout in milliseconds before a BotTester runner will fail a test (when not overriden)
     */
    timeout?: number;
    /**
     * default address bot will use for all communication (when not overriden)
     */
    defaultAddress?: IAddress;
    /**
     * message types that we don't care about and we want to filter out.
     */
    filteredMessageTypes?: string[];
}

const configFilePath = `bot-tester.json`;
const configFileExists = fs.existsSync(configFilePath);

/**
 * default value for timeout. If config/options are set to this value, no timeout will be used
 */
export const NO_TIMEOUT = -1;

let configInternal: IConfig = {
    timeout: NO_TIMEOUT,
    defaultAddress: {
        channelId: 'console',
        user: { id: 'user1', name: 'user1' },
        bot: { id: 'bot', name: 'Bot' },
        conversation: { id: 'user1Conversation' }
    },
    filteredMessageTypes: []
};

if (configFileExists) {
    configInternal = JSON.parse(fs.readFileSync(configFilePath, { encoding: 'utf8' }));
}

export const config = configInternal;
