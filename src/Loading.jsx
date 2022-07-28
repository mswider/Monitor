import React from 'react';
import { keyframes } from '@mui/system';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

function Loading() {
  const spin = keyframes`
    from {
      transform: translate(-50%, -50%) rotate(0deg);
    }
    to {
      transform: translate(-50%, -50%) rotate(360deg);
    }
  `;

  const spinnerStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '100px',
    height: '100px',
    border: theme => `4px solid ${theme.palette.text.primary}`,
    borderRadius: '50%',
    borderTopColor: 'transparent',
    animation: `${spin} 1s infinite linear`
  };
  const textStyle = {
    fontWeight: 'bold',
    position: 'absolute',
    transform: 'translate(-50%, 0)',
    left: '50%',
    bottom: '1.5em'
  };
  return (
    <>
      <Box sx={spinnerStyle} />
      <Typography variant='h3' sx={textStyle}>
        GoGuardian Monitor
      </Typography>
    </>
  );
}

export default Loading;
