import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PusherProvider, ChannelsProvider } from '../PusherClient';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Fade from '@mui/material/Fade';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Main from './Main';

function Error({ title, message }) {
  return (
    <Paper variant="outlined" sx={{ p: 3, minWidth: '24em', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
      <Typography variant="h6" paddingBottom>{title}</Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>{message}</Typography>
      <Link to="/dashboard">
        <Button variant="contained" sx={{ float: 'right' }}>Back to Dashboard</Button>
      </Link>
    </Paper>
  );
}

function Session() {
  const states = {
    NOT_FOUND: 1,
    OK: 2
  };
  let { subAccountId, sessionId } = useParams();
  const isInit = useRef(true);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState();
  const [pusherConfig, setPusherConfig] = useState();
  const [error, setError] = useState(false);
  const [info, setInfo] = useState();

  const loadSession = async sid => {
    const res = await fetch(`./api/devices/sessions/for/${sid}`);
    if (res.ok) {
      const data = await res.json();
      setInfo(data);
      setState(states.OK);
    } else {
      setState(states.NOT_FOUND);
    }
  };

  useEffect(async () => {
    try {
      await Promise.all([
        fetch('./api/pusher/config').then(res => res.json()).then(data => setPusherConfig(data)),
        loadSession(subAccountId)
      ]);
    } catch {
      setError(true);
    }
    setLoading(false);
    isInit.current = false;
  }, []);
  useEffect(async () => {
    if (!isInit.current && !error) {
      setLoading(true);
      try {
        await loadSession(subAccountId);
        setLoading(false);
      } catch {
        setError(true);
      }
    }
  }, [subAccountId]);
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={ theme => theme.mixins.toolbar } />
      <Fade
        in={loading}
        style={{
          transitionDelay: loading ? '800ms' : '0ms',
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)'
        }}
        unmountOnExit
      >
        <CircularProgress />
      </Fade>
      {!loading && ( error ? (
          <Error title="Error" message="Something went wrong." />
        ) : (
          <>
            {state == states.NOT_FOUND && <Error title="Account not found" message="Look for it in the dashboard, or double-check your link." />}
            {state == states.OK && (info.sessions.hasOwnProperty(sessionId) ? (
              <PusherProvider
                clientKey={pusherConfig.key}
                cluster="goguardian"
                authEndpoint="./api/pusher/auth"
                auth={{
                  headers: { 'Authorization': info.id },
                  params: {
                    version: pusherConfig.version,
                    liveStateVersion: pusherConfig.ggVersion,
                    capabilities: `1,2,${pusherConfig.magicNumber}`,
                    clientType: 'extension',
                    os: 'default',
                    protocolVersion: 1
                  }
                }}
              >
                <ChannelsProvider>
                  <Main
                    device={{
                      id: info.id,
                      name: info.name,
                      aid: info.aid,
                      sid: info.sid,
                      isVerified: info.isVerified
                    }}
                    magicNumber={pusherConfig.magicNumber}
                    sessions={info.sessions}
                    session={sessionId}
                    error={() => setError(true)}
                  />
                </ChannelsProvider>
              </PusherProvider>
            ) : (
              <Error title="Session isn't active" message="It might've ended, or the link could be wrong." />
            ))}
          </>
        )
      )}
    </Box>
  );
}

export default Session;