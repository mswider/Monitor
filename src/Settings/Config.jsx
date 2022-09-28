import React, { useState, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Slider from '@mui/material/Slider';
import Button from '@mui/material/Button';
import { post } from '../utils';

function Config() {
  const initialValues = useRef({ interval: 15 });
  const [sliderValue, setSliderValue] = useState(initialValues.current.interval);
  const [loading, setLoading] = useState(true);
  const [modified, setModified] = useState(false);

  const steps = [5, 15, 30, 60, 120].map(num => ({ value: num, label: num % 60 == 0 ? `${num / 60}m` : `${num}s` }));
  const max = steps[steps.length - 1].value + steps[0].value;
  
  const refresh = async () => {
    const interval = await fetch('./info/workers').then(res => res.json()).then(({interval}) => Math.round(interval / 1000));
    initialValues.current.interval = interval;
    setSliderValue(interval);
    setLoading(false);
  };

  const updateInterval = async () => {
    setLoading(true);
    let { workers } = await fetch('./info/workers').then(res => res.json());
    let data = Object.fromEntries(workers.map(
      ({id, data: { name, email }}) => ([id, { name: name || '', email: email || '' }])
    ));
    const interval = sliderValue * 1000;
    await post('./setup/monitoring', { interval, data });
    await refresh();
  };

  useEffect(refresh, []);
  useEffect(() => {
    setModified(initialValues.current.interval != sliderValue);
  }, [sliderValue]);
  return (
    <Box sx={{p: 2}}>
      <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'flex-start' }}>
        <Paper elevation="4" sx={{ maxWidth: theme => theme.spacing(36), p: 4 }}>
          <Typography variant="h6" gutterBottom>Config</Typography>
          <Typography color="text.secondary">Monitor should just work without any config changes, but you can change a few settings for the server and interface.</Typography>
        </Paper>
        <Container maxWidth="sm" sx={{ p: 4, flex: 1, display: 'flex', flexDirection: 'column', rowGap: theme => theme.spacing(4) }}>
          <div>
            <Typography variant="h4" gutterBottom>Server</Typography>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Class Refresh Rate</Typography>
            <Slider
              disabled={loading}
              max={max}
              step={null}
              value={sliderValue}
              marks={steps}
              onChange={(_, e) => setSliderValue(e)}
            />
          </div>
          <Button variant="contained" disabled={!modified || loading} sx={{ maxWidth: 'fit-content', m: 'auto' }} onClick={updateInterval}>Apply Changes</Button>
        </Container>
      </Container>
    </Box>
  );
}

export default Config;