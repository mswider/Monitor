import React, { useState, useEffect } from 'react';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';

function Settings() { // TODO: Redo the CompRand input, it is too long and repetitive
  const [comprand1, setComprand1] = useState({id: '', mode: 'monitor'});
  const [comprand2, setComprand2] = useState({id: '', mode: 'monitor'});
  const [comprand3, setComprand3] = useState({id: '', mode: 'monitor'});
  const [comprand4, setComprand4] = useState({id: '', mode: 'monitor'});
  const [comprand5, setComprand5] = useState({id: '', mode: 'monitor'});
  const [valid, setValid] = useState([true, true, true, true, true]);
  const [needsConfig, setNeedsConfig] = useState(true);
  const [workerInfo, setWorkerInfo] = useState({workersAvailable: false, data: []});
  const [monitoringInterval, setMonitoringInterval] = useState(15000);
  const [monitoring, setMonitoring] = useState({});

  useEffect(() => {
    fetch('./needsConfig').then(res => res.json()).then(setNeedsConfig);
    refreshData();
  }, []);
  const refreshData = () => {
    fetch('./setup/comprands').then(res => res.json()).then(data => {
      setComprand1(data[0] || {id: '', mode: 'monitor'});
      setComprand2(data[1] || {id: '', mode: 'monitor'});
      setComprand3(data[2] || {id: '', mode: 'monitor'});
      setComprand4(data[3] || {id: '', mode: 'monitor'});
      setComprand5(data[4] || {id: '', mode: 'monitor'});
    });
    fetch('./info/workers').then(res => res.json()).then(data => {
      setMonitoringInterval(data.interval);
      if (data.workers.length == 0) {
        setWorkerInfo({workersAvailable: false, data: []});
      } else {
        let available = false;
        let workerData = [];
        let monitoringData = {};
        for (var i in data.workers) {
          if (!data.workers[i].busy || data.workers[i].data.email) {
            available = true;
            workerData.push(data.workers[i]);
            monitoringData[data.workers[i].id] = {
              email: data.workers[i].data.email || '',
              name: data.workers[i].data.name || ''
            };
          }
        }
        if (available) setMonitoring(monitoringData);
        setWorkerInfo({workersAvailable: available, data: workerData});
      }
    });
  };

  const errorInvalid = 'This CompRand is invalid and can\'t be used';
  return (
    <Container maxWidth='sm' style={{marginTop: '64px', padding: '12px'}}>
      <Typography variant='h3' style={{textAlign: 'center', marginBottom: '12px'}}>Settings</Typography>
      <Divider />
      <div style={{padding: '12px'}}>
        <Typography variant='h4'>CompRands</Typography>
        <Divider />
        <TextField variant='outlined' label='CompRand #1' size='small' value={comprand1.id} onChange={e=>setComprand1({...comprand1,id:e.target.value})} error={!valid[0]} helperText={valid[0]?'':errorInvalid} style={{marginTop: '12px', width: '424px'}}></TextField>
        <FormControl variant='standard' size='small' style={{marginTop: '8px', marginLeft: '8px', minWidth: '120px'}}>
          <InputLabel>Mode</InputLabel>
          <Select value={comprand1.mode} onChange={e=>setComprand1({...comprand1,mode:e.target.value})}>
            <MenuItem value='monitor'>Monitor</MenuItem>
            <MenuItem value='worker'>Worker</MenuItem>
          </Select>
        </FormControl>
        <TextField variant='outlined' label='CompRand #2' size='small' value={comprand2.id} onChange={e=>setComprand2({...comprand2,id:e.target.value})} error={!valid[1]} helperText={valid[1]?'':errorInvalid} style={{marginTop: '12px', width: '424px'}}></TextField>
        <FormControl variant='standard' size='small' style={{marginTop: '8px', marginLeft: '8px', minWidth: '120px'}}>
          <InputLabel>Mode</InputLabel>
          <Select value={comprand2.mode} onChange={e=>setComprand2({...comprand2,mode:e.target.value})}>
            <MenuItem value='monitor'>Monitor</MenuItem>
            <MenuItem value='worker'>Worker</MenuItem>
          </Select>
        </FormControl>
        <TextField variant='outlined' label='CompRand #3' size='small' value={comprand3.id} onChange={e=>setComprand3({...comprand3,id:e.target.value})} error={!valid[2]} helperText={valid[2]?'':errorInvalid} style={{marginTop: '12px', width: '424px'}}></TextField>
        <FormControl variant='standard' size='small' style={{marginTop: '8px', marginLeft: '8px', minWidth: '120px'}}>
          <InputLabel>Mode</InputLabel>
          <Select value={comprand3.mode} onChange={e=>setComprand3({...comprand3,mode:e.target.value})}>
            <MenuItem value='monitor'>Monitor</MenuItem>
            <MenuItem value='worker'>Worker</MenuItem>
          </Select>
        </FormControl>
        <TextField variant='outlined' label='CompRand #4' size='small' value={comprand4.id} onChange={e=>setComprand4({...comprand4,id:e.target.value})} error={!valid[3]} helperText={valid[3]?'':errorInvalid} style={{marginTop: '12px', width: '424px'}}></TextField>
        <FormControl variant='standard' size='small' style={{marginTop: '8px', marginLeft: '8px', minWidth: '120px'}}>
          <InputLabel>Mode</InputLabel>
          <Select value={comprand4.mode} onChange={e=>setComprand4({...comprand4,mode:e.target.value})}>
            <MenuItem value='monitor'>Monitor</MenuItem>
            <MenuItem value='worker'>Worker</MenuItem>
          </Select>
        </FormControl>
        <TextField variant='outlined' label='CompRand #5' size='small' value={comprand5.id} onChange={e=>setComprand5({...comprand5,id:e.target.value})} error={!valid[4]} helperText={valid[4]?'':errorInvalid} style={{marginTop: '12px', width: '424px'}}></TextField>
        <FormControl variant='standard' size='small' style={{marginTop: '8px', marginLeft: '8px', minWidth: '120px'}}>
          <InputLabel>Mode</InputLabel>
          <Select value={comprand5.mode} onChange={e=>setComprand5({...comprand5,mode:e.target.value})}>
            <MenuItem value='monitor'>Monitor</MenuItem>
            <MenuItem value='worker'>Worker</MenuItem>
          </Select>
        </FormControl>
      </div>
      <Button variant='contained' color='primary' style={{display: 'block', margin: 'auto'}} onClick={() => {
        fetch('./setup/comprands',{method:'POST',headers: {'Content-Type':'application/json'},body:JSON.stringify([comprand1,comprand2,comprand3,comprand4,comprand5])}).then(res=>res.json()).then(data=>{
          setValid(data.comprands);
          if(data.valid){
            if(needsConfig){
              window.location.reload();
            } else {
              refreshData();
            }
          }
        });
      }}>Change CompRands</Button>
      <div style={{padding: '12px'}}>
        <Typography variant='h4'>Monitoring</Typography>
        <Divider />
        <TextField type='number' variant='outlined' size='small' label='Update Interval (seconds)' style={{marginTop: '12px', marginBottom: '8px'}} value={monitoringInterval / 1000} onChange={e=>setMonitoringInterval(e.target.value * 1000)} />
        <Typography variant='h5'>Worker Configuration</Typography>
        <div style={{padding: '12px'}}>
          {!workerInfo.workersAvailable ? (
            <Typography variant='h6' style={{color: '#757575', margin: '1em 0', fontStyle: 'italic', textAlign: 'center'}}>No Worker CompRands</Typography>
          ) : (
            workerInfo.data.map((worker, i) => monitoring[worker.id] && (
              <Paper variant="outlined" style={{padding: '16px', marginBottom: i == workerInfo.data.length - 1 ? '0px' : '16px'}}>
                <Typography variant='h6'>{worker.id}</Typography>
                <TextField
                  variant='outlined'
                  size='small'
                  label='Email'
                  style={{marginTop: '8px', width: '100%'}}
                  value={monitoring[worker.id].email}
                  error={monitoring[worker.id].email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(monitoring[worker.id].email)}
                  onChange={e=>setMonitoring({...monitoring, [worker.id]: {...monitoring[worker.id], email: e.target.value}})}
                />
                <TextField variant='outlined' size='small' label='Name' style={{marginTop: '8px', width: '100%'}} value={monitoring[worker.id].name} onChange={e=>setMonitoring({...monitoring, [worker.id]: {...monitoring[worker.id], name: e.target.value}})} />
              </Paper>
            ))
          )}
        </div>
      </div>
      <Button variant='contained' color='primary' style={{display: 'block', margin: 'auto'}} onClick={() => {
        const monitoringData = {interval: monitoringInterval, data: monitoring};
        fetch('./setup/monitoring',{method:'POST',headers: {'Content-Type':'application/json'},body:JSON.stringify(monitoringData)}).then(refreshData());
      }}>Update Monitoring</Button>
    </Container>
  );
}

export default Settings;
