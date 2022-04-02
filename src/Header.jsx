import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Tooltip from '@material-ui/core/Tooltip';
import IconButton from '@material-ui/core/IconButton';
import Icon from '@material-ui/core/Icon';
import Typography from '@material-ui/core/Typography';
import Drawer from '@material-ui/core/Drawer';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';
import ListItemIcon from '@material-ui/core/ListItemIcon';

function Header({ rightElement, right, leftElement, left }) {
  const [drawerIsOpen, setDrawerIsOpen] = useState(false);

  const getComponent = type => {
    switch (type) {
      case 'save':
        return  (
          <Tooltip title='Generate Backup File'>
            <a href='./api/backup' target='_blank'>
              <IconButton style={{color: '#fff'}}>
                <Icon>save</Icon>
              </IconButton>
            </a>
          </Tooltip>
        );
      case 'settings':
        return (
          <Link to='/settings'>
            <IconButton style={{color: '#fff'}}>
              <Icon>settings</Icon>
            </IconButton>
          </Link>
        );
      case 'menu':
        return (
          <IconButton onClick={()=>{setDrawerIsOpen(true)}} style={{color: '#fff'}}>
            <Icon>menu</Icon>
          </IconButton>
        );
      case 'back':
        return (
          <Link to='/dashboard'>
            <IconButton style={{color: '#fff'}}>
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
      <AppBar style={{backgroundColor: '#1976D2'}}>
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