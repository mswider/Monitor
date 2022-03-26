import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Loading from './Loading.jsx';
import Dashboard from './Dashboard.jsx';
import LiveChat from './LiveChat.jsx';
import Settings from './Settings.jsx';
import Classroom from './Classroom.jsx';
import UserSearch from './Search.jsx';
import StudentInfo from './StudentInfo.jsx';
import ChatViewer from './ChatViewer.jsx';

function App() {
  const [configMode, setConfigMode] = useState();

  const routes = [
    ['/chat/:sessionId/:studentAID', <ChatViewer />],
    ['/liveChat/:email', <LiveChat />],
    ['/classrooms/:classroomId', <Classroom />],
    ['/studentInfo/:studentAID', <StudentInfo />],
    ['/search', <UserSearch />],
    ['/dashboard', <Dashboard />],
    ['/settings', <Settings />, true],
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
      {routes.map(([path, element, authDisabled]) => 
        <Route path={path} element={authDisabled ? element : (
          <SetupRedirect redirect={configMode}>
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
