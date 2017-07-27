import { IAddress } from 'botbuilder';

export const DEFAULT_ADDRESS: IAddress = { channelId: 'console',
    user: { id: 'user1', name: 'user1' },
    bot: { id: 'bot', name: 'Bot' },
    conversation: { id: 'user1Conversation' }
};
