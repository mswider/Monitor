import React from 'react';
import Avatar from '@mui/material/Avatar';
import AvatarGroup from '@mui/material/AvatarGroup';
import Tooltip from '@mui/material/Tooltip';
import { initials } from '../utils';

function Person({ name }) {
  return (
    <Tooltip title={name}>
      <Avatar sx={{ bgcolor: 'primary.light' }}>{initials(name)}</Avatar>
    </Tooltip>
  );
}

function Avatars({ people }) {
  return (
    <AvatarGroup max={4}>
      {people.map((person) => (
        <Person name={person.name} key={person.aid + '-avatarList'} />
      ))}
    </AvatarGroup>
  );
}

export default Avatars;