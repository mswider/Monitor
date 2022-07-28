import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useMediaQuery from '@mui/material/useMediaQuery';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { blue, amber, grey } from '@mui/material/colors';
import Loading from './Loading.jsx';
import Header from './Header.jsx';
import Dashboard from './Dashboard.jsx';
import LiveChat from './LiveChat.jsx';
import Settings from './Settings.jsx';
import Classroom from './Classroom.jsx';
import UserSearch from './Search.jsx';
import StudentInfo from './StudentInfo.jsx';
import ChatViewer from './ChatViewer.jsx';

function App() {
  const [configMode, setConfigMode] = useState();
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const theme = useMemo(
    () =>
      createTheme({
        palette: prefersDarkMode ? {
          mode: 'dark',
          chat: {
            student: blue[500],
            announcement: amber[600],
            teacher: grey[600]
          }
        } : {
          mode: 'light',
          chat: {
            student: blue[300],
            announcement: amber[200],
            teacher: grey[300]
          }
        }
      }),
    [prefersDarkMode],
  );

  const routes = [
    ['/chat/:sessionId/:studentAID', <ChatViewer />],
    ['/liveChat/:email', <LiveChat />],
    ['/classrooms/:classroomId', <Classroom />],
    ['/studentInfo/:studentAID', <StudentInfo />],
    ['/search', <UserSearch />],
    ['/dashboard', <Dashboard />, {header: {left: 'menu', right: 'settings'}}],
    ['/settings', <Settings />, {noAuth: true, header: {left: configMode ? '' : 'back', right: 'save'}}],
    ['/*', <Navigate to='/dashboard' replace />, {}]
  ];

  useEffect(() => {
    fetch('./needsConfig').then(res => res.json()).then(data => {
      data ? setConfigMode(true) : setConfigMode(false);
    });
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {configMode == undefined ? <Loading /> : (
        <Routes>
          {routes.map(([path, element, options = { header: { left: 'back', right: 'settings' } }]) => 
            <Route path={path} element={(
              <SetupRedirect redirect={!options.noAuth && configMode}>
                {options.header && <Header right={options.header.right} left={options.header.left} />}
                {element}
              </SetupRedirect>
              )}
            />
          )}
        </Routes>
      )}
    </ThemeProvider>
  );
}

function SetupRedirect({redirect = false, children}) {
  if (redirect) return <Navigate to='/settings' />;
  return children;
}

export default App;
