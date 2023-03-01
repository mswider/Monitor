import React, { useState, useEffect } from 'react';
import { useChannel } from '../PusherClient';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Icon from '@mui/material/Icon';
import Divider from '@mui/material/Divider';

function Main({ device, sessions, session, error }) {
  const [subscribed, setSubscribed] = useState(false);
  const channel = useChannel(`presence-session.${session}`);

  useEffect(() => {
    if (!channel) return;

    channel.bind('pusher:subscription_error', err => {
      console.warn(`Pusher ${err.type}:\n${err.error}`);
      error();
    });
    channel.bind('pusher:subscription_succeeded', () => {
      console.log('Pusher subscription succeeded', channel.members.members);
      setSubscribed(true);
    });
  }, [channel]);

  return (
    <Box sx={{ flex: '1', p: 8 }}>
      <Paper elevation="3" sx={{ height: '100%' }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Typography variant="h5">{device.name}</Typography>
          {device.isVerified && <Icon sx={{ ml: 1, color: 'verified' }}>verified</Icon>}
        </Box>
        <Divider />
        {subscribed && <p>subscription success</p>}
      </Paper>
    </Box>
  );
}

export default Main;