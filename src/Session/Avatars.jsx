import React from 'react';
import Avatar from '@mui/material/Avatar';
import AvatarGroup from '@mui/material/AvatarGroup';
import Tooltip from '@mui/material/Tooltip';
import { initials } from '../utils';

const transition = {
  sx: {
    transitionProperty: 'margin-left',
    transitionDuration: '150ms',
    transitionTimingFunction: 'linear'
  },
};

function Person({ name, ...rest }) {
  return (
    <Tooltip title={name}>
      <Avatar {...transition} {...rest} sx={{ bgcolor: 'primary.light' }}>
        {initials(name)}
      </Avatar>
    </Tooltip>
  );
}

function Avatars({ people }) {
  return (
    <AvatarGroup
      max={4}
      componentsProps={{
        additionalAvatar: { ...transition }
      }}
    >
      {people.map((person) => (
        <Person name={person.name} key={person.aid + '-avatarList'} />
      ))}
    </AvatarGroup>
  );
}

export default Avatars;