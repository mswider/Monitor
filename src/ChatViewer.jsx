import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import Icon from '@material-ui/core/Icon';
import Paper from '@material-ui/core/Paper';
import Chat from './Chat.jsx';

function ChatViewer() {
  let { sessionId, studentAID } = useParams();
  const [status, setStatus] = useState('loading');
  const [members, setMembers] = useState({});
  const [messages, setMessages] = useState([]);
  const [classroom, setClassroom] = useState('');

  useEffect(async () => {
    await fetch('./info/classHistory').then(res => res.json()).then(data => setClassroom(data.filter(e => e.id == sessionId)[0].name));
    await fetch('./info/people').then(res => res.json()).then(setMembers);
    fetch(`./api/chat/messages/${studentAID}`).then(async res => {
      if (res.ok) {
        const data = await res.json();
        setMessages(data[sessionId]);
        setStatus('ok');
      } else {  //request only fails if the user doesn't exist
        setStatus('no_user');
      }
    });
  }, []);
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
      <Paper elevation={3} style={{height: '70%', width:'45%', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column'}}>
        <React.Fragment>
          {status == 'loading' && (
            <Typography variant='h3' style={{color: '#757575', margin: 'auto', fontStyle: 'italic'}}>Loading...</Typography>
          )}
          {status == 'no_user' && (
            <Typography variant='h3' style={{color: '#757575', margin: 'auto', fontStyle: 'italic'}}>User Isn't Being Monitored</Typography>
          )}
          {status == 'ok' && (
            <Chat name={`${members[studentAID].name} - ${classroom}`} messages={messages} members={members} noAutoScroll />
          )}
        </React.Fragment>
      </Paper>
    </React.Fragment>
  );
}

export default ChatViewer;
