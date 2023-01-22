import React, { useState } from 'react';
import Accounts from './Accounts';
import Config from './Config';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';

function Settings({ refreshMode, settings, update }) {
  const [view, setView] = useState(0);
  const views = [['Accounts', <Accounts refreshMode={refreshMode} />], ['Config', <Config settings={settings} update={update} />]];

  return (
    <>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', zIndex: theme => theme.zIndex.appBar - 1, position: 'sticky', top: 0 }}>
        <Box sx={ theme => theme.mixins.toolbar } />
        <Tabs centered value={view} onChange={(_, e) => setView(e)} sx={{ bgcolor: 'background.paper' }}>
          {views.map(e => <Tab label={e[0]} />)}
        </Tabs>
      </Box>
      {views[view][1]}
    </>
  );
}

export default Settings;