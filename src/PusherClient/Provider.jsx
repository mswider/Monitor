import React, { useState, createContext, useEffect, useRef } from 'react';
import Pusher from 'pusher-js';

const PusherContext = createContext({});

function PusherProvider({ clientKey, children, ...props }) {
    const [client, setClient] = useState();     // used for reactivity
    const clientRef = useRef();                 // used to disconnect on unmount

    useEffect(() => {
        setClient(clientRef.current = new Pusher(clientKey, props));

        return () => clientRef.current?.disconnect();
    }, []);

    return (
        <PusherContext.Provider value={client}>
            {children}
        </PusherContext.Provider>
    );
}

export { PusherContext, PusherProvider };