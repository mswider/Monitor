import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useMediaQuery from '@mui/material/useMediaQuery';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { blue, amber, grey } from '@mui/material/colors';
import Loading from './Loading.jsx';
import Header from './Header.jsx';
import Dashboard from './Dashboard.jsx';
import Session from './Session';
import Settings from './Settings';
import Classroom from './Classroom.jsx';
import UserSearch from './Search.jsx';
import Student from './Student';
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
          },
          codeHighlight: grey[700]
        } : {
          mode: 'light',
          chat: {
            student: blue[300],
            announcement: amber[200],
            teacher: grey[300]
          },
          codeHighlight: grey[200],
          background: {
            default: grey[100]
          }
        }
      }),
    [prefersDarkMode],
  );
  const refreshMode = async () => {
    const data = await fetch('./api/needsConfig').then(res => res.json());
    data ? setConfigMode(true) : setConfigMode(false);
  };

  const routes = [
    ['/chat/:sessionId/:studentAID', <ChatViewer />],
    ['/session/:subAccountId/:sessionId', <Session />],
    ['/classrooms/:classroomId', <Classroom />],
    ['/student/:studentAID', <Student />],
    ['/search', <UserSearch />],
    ['/dashboard', <Dashboard />, {header: {left: 'menu', right: 'settings'}}],
    ['/settings', <Settings refreshMode={refreshMode} />, {noAuth: true, header: {left: configMode ? '' : 'back', right: 'save', elevation: 0}}],
    ['/*', <Navigate to='/dashboard' replace />, {}]
  ];

  useEffect(refreshMode, []);
  useEffect(() => console.log('theme:', theme), [theme]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {configMode == undefined ? <Loading /> : (
        <Routes>
          {routes.map(([path, element, options = { header: { left: 'back', right: 'settings' } }]) => 
            <Route path={path} element={(
              <SetupRedirect redirect={!options.noAuth && configMode}>
                {options.header && <Header {...options.header} />}
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
