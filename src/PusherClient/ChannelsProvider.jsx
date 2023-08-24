import React, { useContext, useCallback, createContext } from 'react';
import { PusherContext } from './Provider';

const ChannelsContext = createContext({});

function ChannelsProvider({ children }) {
    const client = useContext(PusherContext);

    const subscribe = useCallback(channelName => {
        if (!client || !channelName) return;

        return client.subscribe(channelName);
    }, [client]);

    const unsubscribe = useCallback(channelName => {
        if (!client || !channelName) return;

        return client.unsubscribe(channelName);
    }, [client]);

    const getChannel = useCallback(channelName => {
        if (!client || !channelName) return;

        return client.channel(channelName);
    }, [client]);

    return (
        <ChannelsContext.Provider value={{ subscribe, unsubscribe, getChannel }}>
            {children}
        </ChannelsContext.Provider>
    )
}

export { ChannelsContext, ChannelsProvider };