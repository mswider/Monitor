import { useEffect, useReducer } from 'react';
import { useChannel } from './useChannel';

function membersReducer(state, { type, payload }) {
    switch (type) {
        case 'init':
            return payload;
    
        case 'add':
            return {
                ...state,
                count: state.count + 1,
                members: { ...state.members, [payload.id]: payload.info }
            };
        
        case 'remove':
            const members = { ...state.members };
            delete members[payload.id];
            return {
                ...state,
                count: state.count - 1,
                members: { ...members }
            };
    }
}

function usePresenceChannel(channelName) {
    const channel = useChannel(channelName);
    const [state, dispatch] = useReducer(membersReducer, {
        members: {},
        me: undefined,
        myID: undefined,
        count: 0
    });

    useEffect(() => {
        if (!channel) return;

        channel.bind('pusher:subscription_succeeded', members => {
            dispatch({
                type: 'init',
                payload: {
                    members: members.members,
                    myID: members.myID,
                    me: members.me,
                    count: Object.keys(members.members).length,
                },
            });
        });
        channel.bind('pusher:member_added', member => {
            dispatch({
                type: 'add',
                payload: member,
            });
        });
        channel.bind('pusher:member_removed', member => {
            dispatch({
                type: 'remove',
                payload: member,
            });
        });
    }, [channel]);

    return { channel, ...state };
}

export { usePresenceChannel };