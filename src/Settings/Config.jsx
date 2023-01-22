import React, { useState, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Slider from '@mui/material/Slider';
import Button from '@mui/material/Button';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Icon from '@mui/material/Icon';
import { post } from '../utils';
import { settings as settingsInfo } from './client';

function Config({ settings, update }) {
  const { Appearance: { constants: Appearance } } = settingsInfo;
  const initialValues = useRef({ interval: 15 });
  const [sliderValue, setSliderValue] = useState(initialValues.current.interval);
  const [loading, setLoading] = useState(true);
  const [modified, setModified] = useState(false);

  const steps = [5, 15, 30, 60, 120].map(num => ({ value: num, label: num % 60 == 0 ? `${num / 60}m` : `${num}s` }));
  const max = steps[steps.length - 1].value + steps[0].value;
  
  const refresh = async () => {
    const interval = await fetch('./api/devices/interval').then(res => res.json()).then(data => data.interval);
    initialValues.current.interval = interval;
    setSliderValue(interval);
    setLoading(false);
  };

  const updateInterval = async () => {
    setLoading(true);
    await post('./api/devices/interval', { interval: sliderValue });
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
          <div>
            <Typography variant="h4" gutterBottom>Client</Typography>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Appearance</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <ToggleButtonGroup
                color="primary"
                value={settings.Appearance}
                onChange={(_, e) => update({ key: 'Appearance', value: e })}
                exclusive
              >
                <ToggleButton value={Appearance.LIGHT}><Icon sx={{ mr: 1 }}>light_mode</Icon>Light</ToggleButton>
                <ToggleButton value={Appearance.SYSTEM}><Icon sx={{ mr: 1 }}>settings_brightness</Icon>System</ToggleButton>
                <ToggleButton value={Appearance.DARK}><Icon sx={{ mr: 1 }}>dark_mode</Icon>Dark</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </div>
        </Container>
      </Container>
    </Box>
  );
}

export default Config;