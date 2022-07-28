import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Icon from '@mui/material/Icon';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';

function Header({ rightElement, right, leftElement, left }) {
  const [drawerIsOpen, setDrawerIsOpen] = useState(false);

  const getComponent = type => {
    switch (type) {
      case 'save':
        return (
          <Tooltip title='Generate Backup File'>
            <a href='./api/backup' target='_blank'>
              <IconButton style={{color: '#fff'}} size="large">
                <Icon>save</Icon>
              </IconButton>
            </a>
          </Tooltip>
        );
      case 'settings':
        return (
          <Link to='/settings'>
            <IconButton style={{color: '#fff'}} size="large">
              <Icon>settings</Icon>
            </IconButton>
          </Link>
        );
      case 'menu':
        return (
          <IconButton
            onClick={()=>{setDrawerIsOpen(true)}}
            style={{color: '#fff'}}
            size="large">
            <Icon>menu</Icon>
          </IconButton>
        );
      case 'back':
        return (
          <Link to='/dashboard'>
            <IconButton style={{color: '#fff'}} size="large">
              <Icon>arrow_back</Icon>
            </IconButton>
          </Link>
        );
      default:
        return <></>;
    }
  };

  let elements = {
    right: rightElement || getComponent(right),
    left: leftElement || getComponent(left)
  };
  return (
    <React.Fragment>
      <AppBar>
        <Toolbar>
          {elements.left}
          <Typography variant='h6' style={{position: 'absolute', left: '50%', transform: 'translate(-50%, 0)'}}>GoGuardian Monitor</Typography>
          <div style={{position: 'absolute', right: '12px'}}>
            {elements.right}
          </div>
        </Toolbar>
      </AppBar>
      <Drawer anchor='left' open={drawerIsOpen} onClose={e=>{if(!(e.type=='keydown'&&(e.key=='Tab'||e.key=='Shift')))setDrawerIsOpen(false)}}>
        <List style={{width: '250px'}}>
          <Link to='/search' key='listSearchItem' style={{color: 'unset', textDecoration: 'unset'}}>
            <ListItem button onClick={() => setDrawerIsOpen(false)}>
              <ListItemIcon>
                <Icon>search</Icon>
              </ListItemIcon>
              <ListItemText primary='User Search' />
            </ListItem>
          </Link>
        </List>
      </Drawer>
    </React.Fragment>
  );
}

export default Header;