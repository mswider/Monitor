import React, { useState, useEffect, useRef } from 'react';
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
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material/styles';
import { post } from '../utils';
import { NIL } from 'uuid';

function Accounts({ refreshMode }) {
  const states = {
    MODE: 1,
    CREATE: 2,
    ADD: 3,
    LOAD: 4,
    LOAD_CREATE: 5,
    FAIL: 6,
    SUCCESS: 7
  };
  const [accounts, setAccounts] = useState({});   // [id]: {aid?, sid, locked, inactive, orgName, name?, email?}
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogText, setDialogText] = useState('');
  const [license, setLicense] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState({license: false, name: false, email: false});
  const [uuidValid, setUuidValid] = useState(true);
  const [dialogState, setDialogState] = useState(states.MODE);
  const theme = useTheme();
  const polling = useRef();

  const validators = {
    license: text => /^[a-p]{32}$/.test(text),
    name: text => text.length > 0,
    email: text => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)
  };

  const refreshAccounts = async () => {
    setAccounts(await fetch('./api/devices/list').then(res => res.json()).then(data => Object.entries(data).map(([id, device]) => {
      return [id, {
        aid: device.info.accountId,
        sid: device.info.subAccountId,
        locked: device.locked,
        inactive: device.inactive,
        orgName: window.atob(device.info.orgName),
        name: device.name,
        email: device.info.emailOnFile,
        verified: device.isVerified
      }];
    })).then(Object.fromEntries));
    setLoading(false);
  };
  const assignAccount = async (deviceID, name, email) => {
    return await post('./api/devices/assign', { name, email }, { device: deviceID }).then(res => res.json()).then(data => data.taskID);
  };
  const removeAccount = async deviceID => {
    setLoading(true);
    await fetch('./api/devices/remove', { method: 'POST', headers: { device: deviceID } });
    await refreshAccounts();
  };
  const changeAccountMode = async (deviceID, locked) => {
    setLoading(true);
    await post('./api/devices/locked', { locked }, { device: deviceID });
    await refreshAccounts();
  };
  const addAccount = async deviceID => {
    setDialogState(states.LOAD);
    const res = await fetch('./api/devices/add', { method: 'POST', headers: { device: deviceID } });
    if (Object.keys(accounts).length == 0 && res.ok) await refreshMode();  // Refresh after we add the first account
    setDialogState(res.ok ? states.SUCCESS : states.FAIL);
  };
  const createAccount = async (licenseKey, name, email) => {
    setDialogState(states.LOAD_CREATE);
    const taskID = await post('./api/devices/new', { name, email, orgID: licenseKey }).then(res => res.json()).then(data => data.taskID);
    polling.current = setInterval(async () => {
      const { completed, success } = await fetch(`./api/tasks/${taskID}`).then(res => res.json());
      if (completed) {
        setDialogState(success ? states.SUCCESS : states.FAIL );
        clearInterval(polling.current);
        await refreshAccounts();
      }
    }, 5000);
  };

  const validateID = () => setUuidValid(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i.test(dialogText));
  const validate = () => {setError({license: !validators.license(license), name: !validators.name(name), email: !validators.email(email)})};
  const closeDialog = () => {
    if (dialogState != states.LOAD || dialogState != states.LOAD_CREATE) {
      setDialogOpen(false);
      setTimeout(() => {
        setDialogText('');
        setLicense('');
        setName('');
        setEmail('');
        setDialogState(states.MODE);
        if (dialogState == states.SUCCESS) {
          setLoading(true);
          refreshAccounts();
        }
      }, theme.transitions.duration.leavingScreen);
    }
  };

  useEffect(refreshAccounts, []);
  useEffect(validateID, [dialogText]);
  useEffect(validate, [license, name, email]);
  useEffect(() => clearInterval(polling.current), []);

  return (
    <Box sx={{p: 2}}>
      <Container maxWidth="lg" sx={{ display: 'flex', alignItems: 'flex-start' }}>
        <Paper elevation="4" sx={{ maxWidth: theme => theme.spacing(36), p: 4 }}>
          <Typography variant="h6" gutterBottom>Accounts</Typography>
          <Typography color="text.secondary">Monitor works by tracking the activity of accounts.</Typography>
          <Typography color="text.secondary" gutterBottom>By tracking an account, you can see what classes they joined, when they joined them, and the people in them.</Typography>
          <Typography color="text.secondary">Removing an account doesn't delete it from GoGuardian</Typography>
          <br />
          <Typography variant="h6" gutterBottom>Locked Mode</Typography>
          <Typography color="text.secondary">Devices are locked by default, which is to prevent you assigning them to different people by accident.</Typography>
          <Typography color="text.secondary">If you want to assign the account or update somebody else's chats, then you can unlock it.</Typography>
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
                locked={account.locked}
                inactive={account.inactive}
                verified={account.verified}
                assign={assignAccount}
                remove={removeAccount}
                changeMode={changeAccountMode}
                refreshAccounts={refreshAccounts}
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
          <DialogTitle>Add Account</DialogTitle>
          {dialogState <= states.LOAD_CREATE ? (
            <>
              {dialogState == states.MODE ? (
                <DialogContent>
                  <DialogContentText>A device ID looks like this:</DialogContentText>
                  <Box sx={{ borderRadius: 1, bgcolor: 'codeHighlight', width: 'fit-content', p: theme => `${theme.spacing(0.5)} ${theme.spacing(1)}`, mb: 1 }}>
                    <DialogContentText>{NIL}</DialogContentText>
                  </Box>
                  <DialogContentText sx={{ mt: '0.35em' }}>If you have one, we can track it immediately without needing setup</DialogContentText>
                  <DialogContentText gutterBottom>If not, we can create a virtual device and set it up automatically</DialogContentText>
                  <DialogContentText>Having a real device ID allows us to do more, so they are preferred</DialogContentText>
                  <Button variant="contained" fullWidth endIcon={<Icon>arrow_forward</Icon>} sx={{ mt: 3, mb: 1 }} onClick={() => setDialogState(states.ADD)}>Add Device by ID</Button>
                  <Button variant="outlined" fullWidth endIcon={<Icon>arrow_forward</Icon>} onClick={() => setDialogState(states.CREATE)}>Create Virtual Device</Button>
                </DialogContent>
              ) : (
                dialogState == states.CREATE || dialogState == states.LOAD_CREATE ? (
                  <>
                    <DialogContent>
                      <Box sx={{ mb: 1 }}>
                        <DialogContentText gutterBottom>Create a new virtual device through GoGuardian</DialogContentText>
                        <DialogContentText>Make sure the student's name is the same as their Google account</DialogContentText>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TextField
                          autoFocus
                          error={error.license && license.length > 0}
                          helperText={error.license && license.length > 0 && 'Invalid license'}
                          margin="dense"
                          label="GoGuardian License ID"
                          fullWidth
                          value={license}
                          placeholder="bofhfaclfglmfciiogikgndbdejhjjcc"
                          onChange={e => setLicense(e.target.value)}
                        />
                        <Tooltip title={`Each school in GoGuardian has its own license key. Yours is the ID of the "GoGuardian License" Chrome extension`} placement='top' arrow>
                          <Icon sx={{ ml: 2, mr: 1, color: 'info.dark' }}>help_outline</Icon>
                        </Tooltip>
                      </Box>
                      <TextField
                        error={error.name && name.length > 0}
                        helperText={error.name && name.length > 0 && 'Invalid name'}
                        margin="dense"
                        label="Name"
                        fullWidth
                        value={name}
                        onChange={e => setName(e.target.value)}
                      />
                      <TextField
                        error={error.email && email.length > 0}
                        helperText={error.email && email.length > 0 && 'Invalid email'}
                        margin="dense"
                        label="Email"
                        fullWidth
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                      />
                    </DialogContent>
                    <DialogActions>
                      <Button variant="outlined" onClick={closeDialog} disabled={dialogState == states.LOAD_CREATE}>Cancel</Button>
                      <Button
                        variant="contained"
                        disabled={error.license || error.name || error.email || dialogState == states.LOAD_CREATE}
                        onClick={() => createAccount(license, name, email)}
                      >
                        {dialogState == states.LOAD_CREATE ? 'Creating...' : 'Create'}
                        {dialogState == states.LOAD_CREATE && <CircularProgress size={20} sx={{ ml: 1.5 }} />}
                      </Button>
                    </DialogActions>
                  </>
                ) : (
                  <>
                    <DialogContent>
                      <Box sx={{ mb: 1, mr: 6 }}>
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
                        placeholder={NIL}
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
                )
              )}
              
            </>
          ) : (
            <>
              <DialogContent sx={{ pb: 0 }}>
                <Box sx={{ display: 'flex', mt: 3 }}>
                  <Icon fontSize="large" sx={{ color: dialogState == states.SUCCESS ? 'success.light' : 'error.light' }}>
                    {dialogState == states.SUCCESS ? 'check_circle' : 'error'}
                  </Icon>
                  <DialogTitle sx={{ pt: 0.5, pb: 4 }}>{dialogState == states.SUCCESS ? 'Account added successfully' : 'Failed to add account'}</DialogTitle>
                </Box>
              </DialogContent>
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