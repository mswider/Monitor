import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
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
    <Paper elevation={3} style={{height: '70%', width:'45%', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column'}}>
      {status == 'loading' && (
        <Typography variant='h3' style={{color: '#757575', margin: 'auto', fontStyle: 'italic'}}>Loading...</Typography>
      )}
      {status == 'no_user' && (
        <Typography variant='h3' style={{color: '#757575', margin: 'auto', fontStyle: 'italic'}}>User Isn't Being Monitored</Typography>
      )}
      {status == 'ok' && (
        <Chat name={`${members[studentAID].name} - ${classroom}`} messages={messages} members={members} noAutoScroll />
      )}
    </Paper>
  );
}

export default ChatViewer;
