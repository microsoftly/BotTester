import { IMessage } from 'botbuilder';

export function ignoreInternalSaveMessageFilter(message: IMessage): boolean {
    return message.type !== '__save__';
}

export function ignoreEndOfConversationEventFilter(message: IMessage): boolean {
    return message.type !== 'endOfConversation';
}

export function ignoreTypingEventFilter(message: IMessage): boolean {
    return message.type !== 'typing';
}
