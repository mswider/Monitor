import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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

  const defaultHeader = { header: { left: 'back', right: 'settings' } };
  const routes = [
    ['/chat/:sessionId/:studentAID', <ChatViewer />, defaultHeader],
    ['/liveChat/:email', <LiveChat />, defaultHeader],
    ['/classrooms/:classroomId', <Classroom />, defaultHeader],
    ['/studentInfo/:studentAID', <StudentInfo />, defaultHeader],
    ['/search', <UserSearch />, defaultHeader],
    ['/dashboard', <Dashboard />, {header: {left: 'menu', right: 'settings'}}],
    ['/settings', <Settings />, {noAuth: true, header: {left: configMode ? '' : 'back', right: 'save'}}],
    ['/*', <Navigate to='/dashboard' replace />]
  ];

  useEffect(() => {
    fetch('./needsConfig').then(res => res.json()).then(data => {
      data ? setConfigMode(true) : setConfigMode(false);
    });
  }, []);

  if (configMode == undefined) return <Loading />;
  return (
    <Routes>
      {routes.map(([path, element, options = {}]) => 
        <Route path={path} element={(
          <SetupRedirect redirect={!options.noAuth && configMode}>
            {options.header && <Header right={options.header.right} left={options.header.left} />}
            {element}
          </SetupRedirect>
          )}
        />
      )}
    </Routes>
  );
}

function SetupRedirect({redirect = false, children}) {
  if (redirect) return <Navigate to='/settings' />;
  return children;
}

export default App;
