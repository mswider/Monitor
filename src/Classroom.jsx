import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import Icon from '@material-ui/core/Icon';
import Container from '@material-ui/core/Container';
import Divider from '@material-ui/core/Divider';
import Paper from '@material-ui/core/Paper';
import Tooltip from '@material-ui/core/Tooltip';

function Classroom() {
  let { classroomId } = useParams();
  const [state, setState] = useState({ ready: false });

  useEffect(async () => {
    const classInfo = await fetch('/info/classrooms').then(res => res.json());
    if (classInfo[classroomId]) {
      let _state = { classroomInfo: classInfo[classroomId], ready: true };
      _state.people = await fetch('/info/people').then(res => res.json());
      _state.history = await fetch('/info/classhistory').then(res => res.json()).then(data => data.filter(e => e.classroomId == classroomId));
      _state.chatStatus = await fetch(`/api/chat/classroomStatus/${classroomId}`).then(res => res.json());
      setState(_state);
    }
  }, []);
  const getDiff = (start, end) => {
    const seconds = Math.floor((end - start) / 1000);
    const time = Math.floor(seconds / 60) + ':' + ((seconds % 60) >= 10?(seconds % 60):'0' + (seconds % 60).toString());
    return time;
  };
  const getChatStatusMsg = (statusCode) => {
    const messages = [
      "Chats for this class haven't been recorded yet",
      "Chats for this class are missing some sessions",
      "Chat messages are up to date in this class"
    ];
    return messages[statusCode];
  }
  return (
    <React.Fragment>
      <AppBar style={{backgroundColor: '#1976D2'}}>
        <Toolbar>
          <Link to='/dashboard'>
            <IconButton style={{color: '#fff'}}>
              <Icon>arrow_back</Icon>
            </IconButton>
          </Link>
          <Typography variant='h6' style={{position: 'absolute', left: '50%', transform: 'translate(-50%, 0)'}}>GoGuardian Monitor</Typography>
          <Link to='/settings' style={{position: 'absolute', right: '12px'}}>
            <IconButton style={{color: '#fff'}}>
              <Icon>settings</Icon>
            </IconButton>
          </Link>
        </Toolbar>
      </AppBar>
      {state.ready ? (
        <Container style={{marginTop: '64px', paddingTop: '24px'}}>
          <Typography variant='h2' style={{marginBottom: '5px'}}>{state.classroomInfo.name}</Typography>
          <div style={{padding: '12px'}}>
            <Typography variant='h5' style={{marginBottom: '5px'}}>{`Admins (${Object.keys(state.classroomInfo.admins).length})`}</Typography>
            <Divider />
            <div style={{padding: '12px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-evenly'}}>
              {Object.keys(state.classroomInfo.admins).map(e =>
                <Paper variant='outlined' key={e} style={{display: 'inline-block', padding: '8px', margin: '4px'}}>
                  <Typography variant='h5'>{state.classroomInfo.admins[e].name}</Typography>
                </Paper>
              )}
            </div>
            <Typography variant='h5' style={{marginBottom: '5px'}}>{`Students (${state.classroomInfo.people.length})`}</Typography>
            <Divider />
            <div style={{padding: '12px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-evenly'}}>
              {state.classroomInfo.people.map(e =>
                <Paper key={e} variant='outlined' style={{display: 'flex', padding: '8px', margin: '4px'}}>
                  <Link to={'/studentInfo/' + e} style={{color: 'unset', textDecoration: 'none'}}>
                    <Tooltip title={state.people[e].email}>
                      <Typography variant='h5' style={{marginRight: '5px'}}>{state.people[e].name}</Typography>
                    </Tooltip>
                  </Link>
                  <Tooltip title={getChatStatusMsg(state.chatStatus[e])} placement='right'>
                    <IconButton size='small'>
                      {state.chatStatus[e] == 0 && <Icon style={{color: '#b00020'}}>warning</Icon>}
                      {state.chatStatus[e] == 1 && <Icon style={{color: '#ffab00'}}>error_outline</Icon>}
                      {state.chatStatus[e] == 2 && <Icon style={{color: '#388e3c'}}>check_circle_outline</Icon>}
                    </IconButton>
                  </Tooltip>
                </Paper>
              )}
            </div>
            <Typography variant='h5' style={{marginBottom: '5px'}}>{`Sessions (${state.history.length})`}</Typography>
            <Divider />
            <div style={{padding: '12px', display: 'flex', flexWrap: 'wrap'}}>
              {state.history.map(e =>
                <Paper variant='outlined' key={e.id} style={{display: 'inline-block', padding: '8px', margin: '4px'}}>
                  <Typography variant='h6'>Date: <span style={{fontWeight: '400'}}>{new Date(e.startMs).toLocaleDateString()}</span></Typography>
                  <Typography variant='h6'>Start: <span style={{fontWeight: '400'}}>{new Date(e.startMs).toLocaleTimeString()}</span></Typography>
                  <Typography variant='h6'>Duration: <span style={{fontWeight: '400'}}>{e.endMs?getDiff(e.startMs,e.endMs):'In Progress'}</span></Typography>
                </Paper>
              )}
            </div>
          </div>
        </Container>
      ) : (
        <Typography variant='h3' style={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#757575', fontStyle: 'italic'}}>Class Doesn't Exist</Typography>
      )}
    </React.Fragment>
  );
}

export default Classroom;
