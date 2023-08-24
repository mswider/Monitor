import { useState, useContext, useEffect } from 'react';
import { ChannelsContext } from './ChannelsProvider';

function useChannel(channelName) {
    const [channel, setChannel] = useState();
    const { subscribe, unsubscribe } = useContext(ChannelsContext);

    useEffect(() => {
        if (!channelName || !subscribe || !unsubscribe) return;

        setChannel(subscribe(channelName));

        return () => unsubscribe(channelName);
    }, [channelName, subscribe, unsubscribe]);

    return channel;
}

export { useChannel };