import React, { useState, useEffect } from 'react';
import Account from './Account';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Icon from '@mui/material/Icon';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Skeleton from '@mui/material/Skeleton';
import Fab from '@mui/material/Fab';
import CircularProgress from '@mui/material/CircularProgress';
import { useTheme } from '@mui/material/styles';
import { copy, post } from '../utils';

function Accounts({ refreshMode }) {
  const states = {
    ADD: 1,
    LOAD: 2,
    FAIL: 3,
    SUCCESS: 4
  };
  const [accounts, setAccounts] = useState({});   // [id]: {aid?, sid, worker, orgName, name?, email?}
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogText, setDialogText] = useState('');
  const [uuidValid, setUuidValid] = useState(true);
  const [dialogState, setDialogState] = useState(states.ADD);
  const theme = useTheme();

  const refreshAccounts = async () => {
    setAccounts(await fetch('./setup/comprands').then(res => res.json()).then(async data => await Promise.all(data.map(async device => {
      const userInfo = device.data.accountId && await fetch(`./info/people/${device.data.accountId}`).then(res => res.ok && res.json());
      return [device.id, {
        aid: device.data.accountId,
        sid: device.data.subAccountId,
        worker: device.mode == 'worker',
        orgName: window.atob(device.data.orgName),
        name: userInfo?.name,
        email: device.data.emailOnFile
      }];
    }))).then(Object.fromEntries));
    setLoading(false);
  };
  const assignAccount = async (deviceID, name, email) => {
    const { interval, workers } = await fetch('./info/workers').then(res => res.json());
    let data = Object.fromEntries(workers.map(
      ({id, data: { name, email }}) => ([id, { name: name || '', email: email || '' }])
    ));
    data[deviceID] = { name, email };
    const body = { interval, data };
    await post('./setup/monitoring', body);
    await refreshAccounts();
  };
  const removeAccount = async deviceID => {
    setLoading(true);
    let newAccounts = copy(accounts);
    delete newAccounts[deviceID];
    const data = Object.entries(newAccounts).map(([id, account]) => ({id, mode: account.worker ? 'worker' : 'monitor'}));
    await post('./setup/comprands', data);
    await refreshAccounts();
  };
  const changeAccountMode = async (deviceID, isWorker) => {
    setLoading(true);
    let newAccounts = copy(accounts);
    newAccounts[deviceID].worker = isWorker;
    const data = Object.entries(newAccounts).map(([id, account]) => ({id, mode: account.worker ? 'worker' : 'monitor'}));
    await post('./setup/comprands', data);
    await refreshAccounts();
  };
  const addAccount = async deviceID => {
    setDialogState(states.LOAD);
    const data = Object.entries(accounts).map(([id, account]) => ({id, mode: account.worker ? 'worker' : 'monitor'}));
    data.push({ id: deviceID, mode: 'monitor' });
    const { valid } = await post('./setup/comprands', data).then(res => res.json());
    if (data.length == 1 && valid) await refreshMode();
    setDialogState(valid ? states.SUCCESS : states.FAIL);
  };

  const validateID = () =>  setUuidValid(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i.test(dialogText));
  const closeDialog = () => {
    if (dialogState != states.LOAD) {
      setDialogOpen(false);
      setTimeout(() => {
        setDialogText('');
        setDialogState(states.ADD);
        if (dialogState == states.SUCCESS) {
          setLoading(true);
          refreshAccounts();
        }
      }, theme.transitions.duration.leavingScreen);
    }
  };

  useEffect(refreshAccounts, []);
  useEffect(validateID, [dialogText]);

  return (
    <Box sx={{p: 2}}>
      <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'flex-start' }}>
        <Paper elevation="4" sx={{ maxWidth: theme => theme.spacing(36), p: 4 }}>
          <Typography variant="h6" gutterBottom>Accounts</Typography>
          <Typography color="text.secondary">Monitor works by tracking the activity of accounts.</Typography>
          <Typography color="text.secondary" gutterBottom>By tracking an account, you can see what classes they joined, when they joined them, and the people in them.</Typography>
          <Typography color="text.secondary">Removing an account doesn't delete it from GoGuardian</Typography>
          <br />
          <Typography variant="h6" gutterBottom>Worker Mode</Typography>
          <Typography color="text.secondary">Workers aren't tracked, but they let you save chats from other accounts. Their account details <i>will</i> be changed during use.</Typography>
        </Paper>
        <Container maxWidth="sm" sx={{ p: 4, flex: 1, display: 'flex', flexDirection: 'column', rowGap: theme => theme.spacing(4) }}>
          {loading ? (
            <>
              <Skeleton variant="rounded" sx={{ height: theme => theme.spacing(24) }} />
              <Skeleton variant="rounded" sx={{ height: theme => theme.spacing(24) }} />
            </>
          ) : (
            Object.keys(accounts).length > 0 ? Object.entries(accounts).map(([id, account]) => (
              <Account 
                key={id}
                deviceID={id}
                aid={account.aid}
                sid={account.sid}
                school={account.orgName}
                email={account.email}
                name={account.name}
                worker={account.worker}
                assign={assignAccount}
                remove={removeAccount}
                changeMode={changeAccountMode}
              />
            )) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ textAlign: 'center', fontStyle: 'italic', color: 'text.secondary' }}>No accounts attached</Typography>
                <Button 
                  variant="outlined"
                  sx={{ maxWidth: 'fit-content', mt: 2 }}
                  startIcon={<Icon>add</Icon>}
                  onClick={() => setDialogOpen(true)}
                >
                  Add Account
                </Button>
              </Box>
            )
          )}
        </Container>
        {Object.keys(accounts).length > 0 && (
          <Fab color="primary" sx={{ position: 'fixed', bottom: 16, right: 16, borderRadius: 4 }} onClick={() => setDialogOpen(true)}>
            <Icon>person_add</Icon>
          </Fab>
        )}
        <Dialog open={dialogOpen} onClose={closeDialog}>
          {dialogState <= states.LOAD ? (
            <>
              <DialogTitle>Add Account</DialogTitle>
              <DialogContent>
                <Box sx={{mb: 1, mr: 6}}>
                  <DialogContentText>Attach an account to Monitor</DialogContentText>
                  <DialogContentText>Add the device ID below, and we'll track it</DialogContentText>
                </Box>
                <TextField
                  autoFocus
                  error={(!uuidValid && dialogText.length > 0) || Object.keys(accounts).includes(dialogText)}
                  helperText={!uuidValid && dialogText.length > 0 ? 'Invalid device ID' : Object.keys(accounts).includes(dialogText) && 'Account is already tracked'}
                  margin="dense"
                  label="Device ID"
                  fullWidth
                  value={dialogText}
                  placeholder="00000000-0000-0000-0000-000000000000"
                  onChange={e => setDialogText(e.target.value)}
                />
              </DialogContent>
              <DialogActions>
                <Button variant="outlined" onClick={closeDialog} disabled={dialogState == states.LOAD}>Cancel</Button>
                <Button
                  variant="contained"
                  disabled={!uuidValid || Object.keys(accounts).includes(dialogText) || dialogState == states.LOAD}
                  onClick={() => addAccount(dialogText)}
                >
                  {dialogState == states.LOAD ? 'Adding...' : 'Add'}
                  {dialogState == states.LOAD && <CircularProgress size={20} sx={{ ml: 1.5 }} />}
                </Button>
              </DialogActions>
            </>
          ) : (
            <>
              <DialogContent sx={{ pb: 0, pt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Icon fontSize="large" sx={{ color: dialogState == states.SUCCESS ? 'success.light' : 'error.light' }}>
                    {dialogState == states.SUCCESS ? 'check_circle' : 'error'}
                  </Icon>
                </Box>
              </DialogContent>
              <DialogTitle sx={{ pt: 0.5, pb: 4 }}>{dialogState == states.SUCCESS ? 'Account added successfully' : 'Failed to add account'}</DialogTitle>
              <DialogActions>
                <Button variant="contained" onClick={closeDialog}>Ok</Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Container>
    </Box>
  );
}

export default Accounts;