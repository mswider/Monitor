import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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

function User({ person, link }) {
  const disabled = person.type !== USER.monitored;
  const element = (
    <ListItemButton
      selected={person.selected}
      disabled={disabled}
      sx={{ borderRadius: 3 }}
    >
      <ListItemIcon>
        <PersonIcon type={person.type} />
      </ListItemIcon>
      <ListItemText
        primary={
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            {person.name}
            <ListItemIcon sx={{ gap: 1 }}>
              {person.isVerified && <Icon>monitor</Icon>}
            </ListItemIcon>
          </Box>
        }
      />
    </ListItemButton>
  );

  return disabled || person.selected ? (
    element
  ) : (
    <Link to={link} style={{ color: 'unset', textDecoration: 'unset' }}>
      {element}
    </Link>
  );
}

function UserList({ people, title, session }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <React.Fragment>
      <ListSubheader sx={{ borderRadius: 2 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          {title} — {people.length}
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
            sx={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: (theme) => `${theme.transitions.duration.shortest}ms`
            }}
          >
            <Icon>expand_more</Icon>
          </IconButton>
        </Box>
      </ListSubheader>
      <Collapse in={expanded} sx={{ mt: 1, mb: 1 }}>
        {people.map((person) => (
          <User
            key={person.aid + '-presence'}
            person={person}
            link={`/session/${person.sid}/${session}`}
          />
        ))}
      </Collapse>
    </React.Fragment>
  );
}

function ActivityList({ online, offline, session }) {
  return (
    <List component="nav" sx={{ p: 1, pt: 0 }}>
      <UserList people={online} title="Online" session={session} />
      <UserList people={offline} title="Offline" session={session} />
    </List>
  );
}

export default ActivityList;
export { USER };