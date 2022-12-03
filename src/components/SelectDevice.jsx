import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';

function SelectDevice({ dialogOpen, closeDialog, devices, onSelect }) {
  return (
    <Dialog open={dialogOpen} onClose={closeDialog}>
      <DialogTitle>Select a Worker</DialogTitle>
      <DialogContent>
        <List>
          {devices.map(([id, device]) => 
            <ListItem button key={id} onClick={() => {
              onSelect(id);
              closeDialog();
            }}>
              <ListItemText sx={{ pr: 2 }}>
                {device.info.emailOnFile || 'Unknown User'}
              </ListItemText>
            </ListItem>  
          )}
        </List>
      </DialogContent>
    </Dialog>
  );
}

export default SelectDevice;