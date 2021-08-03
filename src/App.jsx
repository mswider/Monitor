import React, { useState, useEffect } from 'react';
import { Switch, Route, Redirect } from 'react-router-dom';
import Loading from './Loading.jsx';
import Dashboard from './Dashboard.jsx';
import LiveChat from './LiveChat.jsx';
import Settings from './Settings.jsx';
import Classroom from './Classroom.jsx';
import UserSearch from './Search.jsx';
import StudentInfo from './StudentInfo.jsx';

function App() {
  const [state, setState] = useState('loading');
  const [mode, setMode] = useState('');
  useEffect(() => {
    fetch('/needsConfig').then(res => res.json()).then(data => {
      setState('ready');
      data?setMode('setup'):setMode('default');
    });
  }, []);
  return (
    <React.Fragment>
      {state == 'loading' && (
        <Loading />
      )}
      {state == 'ready' && (
        <Switch>
          <Route path='/classrooms/:classroomId'>
            <SetupRedirect mode={mode}>
              <Classroom />
            </SetupRedirect>
          </Route>
          <Route path='/liveChat/:email'>
            <SetupRedirect mode={mode}>
              <LiveChat />
            </SetupRedirect>
          </Route>
          <Route path='/dashboard'>
            <SetupRedirect mode={mode}>
              <Dashboard />
            </SetupRedirect>
          </Route>
          <Route path='/search'>
            <SetupRedirect mode={mode}>
              <UserSearch />
            </SetupRedirect>
          </Route>
          <Route path='/studentInfo/:studentAID'>
            <SetupRedirect mode={mode}>
              <StudentInfo />
            </SetupRedirect>
          </Route>
          <Route path='/settings'>
            <Settings />
          </Route>
          <Route path='/'>
            <SetupRedirect mode={mode}>
              <Redirect to='/dashboard' />
            </SetupRedirect>
          </Route>
        </Switch>
      )}
    </React.Fragment>
  );
}

function SetupRedirect(props) {
  return (
    <React.Fragment>
      {props.mode == 'default' && (
        props.children
      )}
      {props.mode == 'setup' && (
        <Redirect to='/settings' />
      )}
    </React.Fragment>
  );
}

export default App;
