import React, { useState, useEffect, useRef } from "react";
import { Link } from 'react-router-dom';
import { usePusher } from "@harelpls/use-pusher";
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Icon from '@mui/material/Icon';
import Divider from '@mui/material/Divider';

function Main({ device, sessions, session }) {
  const { client } = usePusher();
  useEffect(() => console.log('pusher:', client), [client]);
  useEffect(() => () => console.log('unmount'), []);
  return (
    <Box sx={{ flex: '1', p: 8 }}>
      <Paper elevation="3" sx={{ height: '100%' }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Typography variant="h5">{device.name}</Typography>
          {device.isVerified && <Icon sx={{ ml: 1, color: 'verified' }}>verified</Icon>}
        </Box>
        <Divider />
      </Paper>
    </Box>
  );
}

export default Main;