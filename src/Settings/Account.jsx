import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Collapse from '@mui/material/Collapse';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Icon from '@mui/material/Icon';
import ListItemIcon from '@mui/material/ListItemIcon';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from "@mui/material";
import { useTheme } from '@mui/material/styles';

function Account({ deviceID = '-', aid = '-', sid = '-', school = 'Unknown School', email = '-', name = 'Unknown User', worker, assign, remove, changeMode }) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogName, setDialogName] = useState(name);
  const [dialogEmail, setDialogEmail] = useState(email);
  const [dialogInfo, setDialogInfo] = useState(false);
  const [confirmModeSwitch, setConfirmModeSwitch] = useState(false);
  const [error, setError] = useState({name: false, email: false});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const anchor = useRef(null);
  const theme = useTheme();
  
  const validators = {
    name: text => text.length > 0,
    email: text => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)
  };

  const closeConfirm = () => {setConfirmOpen(false); setMenuOpen(false)};
  const refreshForm = () => {setDialogName(name); setDialogEmail(email)};
  const closeDialog = () => {setDialogOpen(false); setMenuOpen(false); setTimeout(() => {setDialogInfo(false); refreshForm()}, theme.transitions.duration.leavingScreen)};
  const validate = () => {setError({name: !validators.name(dialogName), email: !validators.email(dialogEmail)})}

  useEffect(refreshForm, [name, email]);
  useEffect(validate, [dialogName, dialogEmail]);

  return (
    <Card elevation="3" sx={{ borderRadius: 3 }}>
      <Box sx={{ borderRadius: 3, borderTopLeftRadius: 0, borderTopRightRadius: 0, bgcolor: theme => alpha(theme.palette.primary.main, 0.1) }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
          <CardContent sx={{ flex: 1, pb: 1 }}>
            <Typography variant="h5">{name}</Typography>
            <Typography variant="subtitle1" color="text.secondary">{email}</Typography>
            <Box sx={{ display: 'flex' }}>
              <Icon fontSize="small">domain</Icon>
              &nbsp;
              <Typography variant="subtitle2" color="text.secondary">{school}</Typography>
            </Box>
          </CardContent>
          <Box sx={{display: 'flex', alignItems: 'center'}}>
            {aid == '-' && (
              <Tooltip placement="top" title="Account hasn't been configured" arrow>
                <Icon sx={{ color: 'warning.light' }}>error_outline</Icon>
              </Tooltip>
            )}
            <IconButton onClick={() => setMenuOpen(true)} ref={anchor} sx={{ m: 2 }}>
              <Icon>more_vert</Icon>
            </IconButton>
            <Menu
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
              anchorEl={anchor.current}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              transformOrigin={{ horizontal: 'right' }}
            >
              <MenuList disablePadding>
                {aid != '-' && (
                  <Link to={`/studentInfo/${aid}`} style={{ color: 'unset', textDecoration: 'none' }}>
                    <MenuItem>
                      <ListItemIcon><Icon>person</Icon></ListItemIcon>
                      Profile
                    </MenuItem>
                  </Link>
                )}
                {worker && deviceID != '-' && (
                  <MenuItem onClick={() => setDialogOpen(true)}>
                    <ListItemIcon><Icon>edit</Icon></ListItemIcon>
                    Edit
                  </MenuItem>
                )}
                <MenuItem sx={{ color: 'error.main' }} onClick={() => setConfirmOpen(true)}>
                  <ListItemIcon><Icon color="error">remove_circle_outline</Icon></ListItemIcon>
                  Remove
                </MenuItem>
              </MenuList>
            </Menu>
            <Dialog open={confirmOpen} onClose={closeConfirm}>
              <DialogTitle>Remove account from Monitor?</DialogTitle>
              <DialogActions>
                <Button onClick={closeConfirm} variant="outlined">Cancel</Button>
                <Button onClick={() => {closeConfirm(); remove(deviceID);}} variant="contained">Ok</Button>
              </DialogActions>
            </Dialog>
            <Dialog open={confirmModeSwitch} onClose={() => setConfirmModeSwitch(false)}>
              <DialogTitle>Change account mode?</DialogTitle>
              <DialogContent>
                <DialogContentText>This account will become a <Box sx={{ fontWeight: 'fontWeightBold' }} component="span">{worker ? 'monitor' : 'worker'}</Box></DialogContentText>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setConfirmModeSwitch(false)} variant="outlined">Cancel</Button>
                <Button variant="contained" onClick={() => {setConfirmModeSwitch(false); changeMode(deviceID, !worker)}}>Ok</Button>
              </DialogActions>
            </Dialog>
            {worker && (
              <Dialog open={dialogOpen} onClose={closeDialog}>
                {dialogInfo ? (
                  <>
                    <DialogTitle>Edit Account</DialogTitle>
                    <DialogContent>
                      <DialogContentText>A request has been made to reassign this account</DialogContentText>
                      <DialogContentText>GoGuardian's servers tend to be slow, so this could take several minutes</DialogContentText>
                      <DialogContentText>Check the Monitor server logs for updates</DialogContentText>
                    </DialogContent>
                    <DialogActions>
                      <Button variant="contained" onClick={closeDialog}>Ok</Button>
                    </DialogActions>
                  </>
                ) : (
                  <>
                    <DialogTitle>Edit Account</DialogTitle>
                    <DialogContent>
                      <Box sx={{mb: 1}}>
                        <DialogContentText>Assign another user to this device</DialogContentText>
                        <DialogContentText>This can change the actual account's info, be careful</DialogContentText>
                      </Box>
                      <TextField
                        autoFocus
                        error={error.name}
                        helperText={error.name && 'Invalid name'}
                        margin="dense"
                        label="Name"
                        fullWidth
                        value={dialogName}
                        onChange={e => setDialogName(e.target.value)}
                      />
                      <TextField
                        error={error.email}
                        helperText={error.email && 'Invalid email'}
                        margin="dense"
                        label="Email"
                        fullWidth
                        type="email"
                        value={dialogEmail}
                        onChange={e => setDialogEmail(e.target.value)}
                      />
                    </DialogContent>
                    <DialogActions>
                      <Button variant="outlined" onClick={closeDialog}>Cancel</Button>
                      <Button
                        variant="contained"
                        disabled={(dialogName == name && dialogEmail == email) || error.name || error.email}
                        onClick={() => {assign(deviceID, dialogName, dialogEmail).then(() => setDialogInfo(true))}}
                      >
                        Update
                      </Button>
                    </DialogActions>
                  </>
                )}
              </Dialog>
            )}
          </Box>
        </Box>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
          <ToggleButtonGroup
              color="primary"
              value={worker ? 'worker' : 'monitor'}
              onChange={(_, e) => e && setConfirmModeSwitch(true)}
              exclusive
              size="small"
          >
            <ToggleButton value="monitor">Monitor</ToggleButton>
            <ToggleButton value="worker">Worker</ToggleButton>
          </ToggleButtonGroup>
          <IconButton 
            onClick={() => setExpanded(!expanded)} 
            sx={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: theme => `${theme.transitions.duration.shortest}ms`
            }}
          >
            <Icon>expand_more</Icon>
          </IconButton>
        </Box>
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ p:2 }}>
          <KeyValue name="Device ID" value={deviceID} />
          <KeyValue name="Account ID" value={aid} />
          <KeyValue name="SubAccount ID" value={sid} />
        </Box>
      </Collapse>
    </Card>
  );
}

function KeyValue({ name, value }) {
  return (
    <>
      <Typography variant="h6" sx={{ mb: 0.5 }}>{name}:</Typography>
      <Typography variant="subtitle2" color="text.secondary">
        <Box sx={{ borderRadius: 1, bgcolor: 'codeHighlight', width: 'fit-content', p: theme => `${theme.spacing(0.5)} ${theme.spacing(1)}`, mb: 1 }}>
          <code>{value}</code>
        </Box>
      </Typography>
    </>
  );
}

export default Account;