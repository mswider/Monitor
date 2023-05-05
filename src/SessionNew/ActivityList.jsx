import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Icon from '@mui/material/Icon';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListSubheader from '@mui/material/ListSubheader';
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';

const USER = {
  admin: 0,
  student: 1,
  monitored: 2
};

function PersonIcon({ type }) {
  switch (type) {
    case USER.student:
      return <Icon>person_outline</Icon>;
    case USER.admin:
      return <Icon>supervisor_account</Icon>;
    case USER.monitored:
      return <Icon>person</Icon>;
  }
}

function User({ person }) {
  return (
    <ListItemButton selected={person.selected} disabled={person.type !== USER.monitored}>
      <ListItemIcon>
        <PersonIcon type={person.type} />
      </ListItemIcon>
      <ListItemText primary={
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {person.name}
          {person.isVerified && 
            <ListItemIcon>
              <Icon sx={{ ml: 1, color: 'verified' }}>verified</Icon>
            </ListItemIcon>
          }
        </Box>
      } />
    </ListItemButton>
  );
}

function UserList({ people, title }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <>
      <ListSubheader>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {title} — {people.length}
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
            sx={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: theme => `${theme.transitions.duration.shortest}ms`
            }}
          >
            <Icon>expand_more</Icon>
          </IconButton>
        </Box>
      </ListSubheader>
      <Collapse in={expanded}>
        {people.map(person => <User key={person.aid + '-presence'} person={person} /> )}
      </Collapse>
    </>
  );
}

function ActivityList({ online, offline }) {
  return (
    <List component='nav'>
      <UserList people={online} title="Online" />
      <UserList people={offline} title="Offline" />
    </List>
  );
}

export default ActivityList;
export { USER };