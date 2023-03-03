import React, { useState, useEffect } from 'react';
import { useChannel, usePresenceChannel } from '../PusherClient';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Icon from '@mui/material/Icon';
import Divider from '@mui/material/Divider';

function Main({ device, sessions, session, error }) {
  const [subscribed, setSubscribed] = useState({ presence: false, chat: false, control: false });
  const [controlName, setControlName] = useState();
  const { channel: presenceChannel, members: presenceMembers, count: presenceCount } = usePresenceChannel(`presence-session.${session}`);
  const { channel: chatChannel,     members: chatMembers,     count: chatCount } = usePresenceChannel(`presence-student.${device.aid}-session.${session}`);
  const controlChannel = useChannel(controlName);

  useEffect(() => {
    if (!presenceChannel) return;

    presenceChannel.bind('pusher:subscription_error', err => {
      console.warn(`Pusher ${err.type} in presence:\n${err.error}`);
      error();
    });
    presenceChannel.bind('pusher:subscription_succeeded', () => setSubscribed(e => ({ ...e, presence: true })));
  }, [presenceChannel]);
  useEffect(() => {
    if (!chatChannel) return;

    chatChannel.bind('pusher:subscription_error', err => {
      console.warn(`Pusher ${err.type} in chat:\n${err.error}`);
      error();
    });
    chatChannel.bind('pusher:subscription_succeeded', () => setSubscribed(e => ({ ...e, chat: true })));
  }, [chatChannel]);
  useEffect(() => {
    if (!controlChannel) return;

    controlChannel.bind('pusher:subscription_error', err => {
      console.warn(`Pusher ${err.type} in control:\n${err.error}`);
      error();
    });
    controlChannel.bind('pusher:subscription_succeeded', () => setSubscribed(e => ({ ...e, control: true })));
  }, [controlChannel]);

  useEffect(() => {
    if (device.isVerified) {
      setControlName(`private-subaccount.${device.sid}`);
    } else {
      console.log('Skipping connection to control channel: device is not verified');
    }
  }, []);

  return (
    <Box sx={{ flex: '1', p: 8 }}>
      <Paper elevation="3" sx={{ height: '100%' }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Typography variant="h5">{device.name}</Typography>
          {device.isVerified && <Icon sx={{ ml: 1, color: 'verified' }}>verified</Icon>}
        </Box>
        <Divider />
        {subscribed.presence && <p>presence subscription success</p>}
        {subscribed.chat && <p>chat subscription success</p>}
        {subscribed.control && <p>control subscription success</p>}
        {subscribed.presence && (
          <Box sx={{ m: 4 }}>
            <Typography variant="h4">Presence members: ({presenceCount})</Typography>
            {Object.entries(presenceMembers).map(([id, member]) => (
              <Typography variant="h6" key={id + '-presence'}><b>{id}: </b>{member.name}</Typography>
            ))}
            <br />
            <Typography variant="h4">Chat members: ({chatCount})</Typography>
            {Object.entries(chatMembers).map(([id, member]) => (
              <Typography variant="h6" key={id + '-chat'}><b>{id}: </b>{member.name}</Typography>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
}

export default Main;