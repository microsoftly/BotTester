import { IAdaptiveCard } from 'adaptivecards';
import { IAttachment, IMessage, Message} from 'botbuilder';

export function getAdaptiveCard() : IAdaptiveCard {
    const action = {
        type:   'Action.OpenUrl',
        url:   'http://adaptivecards.io',
        title:   'Learn More'
    };

    return {
        type: 'AdaptiveCard',
        version: '1.0',
        body: [
        {
            type: 'TextBlock',
            text: 'Hello World!',
            size: 'large'
        },
        {
            type: 'TextBlock',
            text:   '*Sincerely yours,*'
        },
        {
            type:   'TextBlock',
            text:   'Adaptive Cards',
            separation:   'none'
        }
        ],
        actions: [ action ]
    };
}

export function getAdaptiveCardAttachment(adaptiveCard?: IAdaptiveCard): IAttachment {
    adaptiveCard = adaptiveCard || getAdaptiveCard();

    return {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: adaptiveCard
    };
}

export function getAdaptiveCardMessage(adaptiveCard?: IAdaptiveCard): IMessage {
    return new Message()
        .addAttachment(getAdaptiveCardAttachment(adaptiveCard))
        .toMessage();
}
