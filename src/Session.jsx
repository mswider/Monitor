import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Pusher from 'pusher-js';
import { v1 as uuidv1 } from 'uuid';
import Typography from '@mui/material/Typography';
import Icon from '@mui/material/Icon';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chat from './Chat.jsx';

function LiveChat() {
  let { subAccountId, sessionId } = useParams();
  const [username, setUsername] = useState('Connecting...');
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState({});
  const [text, setText] = useState('');
  const [pusherInfo, setPusherInfo] = useState({});
  const [status, setStatus] = useState('loading');
  const [chatKey, setChatKey] = useState(uuidv1()); //Fixes a bug where prop changes aren't reacted to
  const pusherRef = useRef();
  useEffect(async () => {
    fetch('./api/people').then(res => res.json()).then(setMembers);
    const devices = await fetch('./api/devices/list').then(res => res.json()).then(Object.entries);
    const searchResult = devices.find(([_, { info }]) => (info.subAccountId == subAccountId));
    if (searchResult) {
      const [id, { info }] = searchResult;
      const session = await fetch('./api/devices/sessions').then(res => res.json()).then(data => data.sessions[sessionId]);
      if (session?.devices.includes(id)) {
        setStatus('ok');
        const settings = await fetch('./api/pusher/config').then(res => res.json());
        pusherRef.current = new Pusher(settings.key, {cluster: 'goguardian', authEndpoint: './api/pusher/auth', auth: {headers: {'Authorization': id}, params: {version: settings.version, liveStateVersion: settings.ggVersion}}});
        const channelNameTemp = `presence-student.${info.accountId}-session.${sessionId}`;
        setPusherInfo({channel: channelNameTemp, studentId: info.accountId, sessionId: session.info.id, classroomId: session.info.classroomId}); //Allows us to send messages outside of this hook
        const channel = pusherRef.current.subscribe(channelNameTemp);
        channel.bind('pusher:subscription_succeeded', () => {
          setUsername(`${channel.members.me.info.name} | ${session.info.classroomName}`);
        });
        channel.bind('client-chat-message', (data) => {
          // For some reason, the first message recieved will always erase the saved messages.
          // This happens because the function always thinks messages is empty when it gets a-
          // message for the first time. After that it works normally. Why?
          let tempMessages = messages;
          tempMessages.push(data);
          setMessages(tempMessages);
          setChatKey(uuidv1());
        });
        await fetch(`./api/pusher/history/${sessionId}`, {headers: {'Auth': id}}).then(res => res.json()).then(data => setMessages(data.messages));
      } else {
        setStatus('no_classes');
      }
    } else {
      setStatus('no_user');
    }
  }, []);
  useEffect(() => {
    return () => {
      pusherRef.current?.disconnect();
    };
  }, []);

  const sendMessage = () => {
    if (text != '') {
      const mainMsg = {
        acknowledged: false,
        payload: {
          content: text,
          messageId: uuidv1(),
          type: 'message'
        },
        sender: {
          id: pusherInfo.studentId,
          type: 'student'
        },
        sessionId: pusherInfo.sessionId,
        studentId: pusherInfo.studentId,
        timestamp: Math.floor(Date.now() / 1000)
      };
      let tempMessages = messages;
      tempMessages.push(mainMsg);
      setMessages(tempMessages);
      setText('');
      console.log({...mainMsg, classroomId: pusherInfo.classroomId, eventType: 'client-chat-message'});
      pusherRef.current.channel(pusherInfo.channel).trigger('client-chat-message', {...mainMsg, classroomId: pusherInfo.classroomId, eventType: 'client-chat-message'});
    }
  };
  return (
    <Paper elevation={3} style={{height: '70%', width:'45%', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column'}}>
      {status == 'loading' && (
        <Typography variant='h3' style={{color: '#757575', margin: 'auto', fontStyle: 'italic'}}>Loading...</Typography>
      )}
      {status == 'no_user' && (
        <Typography variant='h3' style={{color: '#757575', margin: 'auto', fontStyle: 'italic'}}>User Isn't Being Monitored</Typography>
      )}
      {status == 'no_classes' && (
        <Typography variant='h3' style={{color: '#757575', margin: 'auto', fontStyle: 'italic'}}>User Isn't In This Class</Typography>
      )}
      {status == 'ok' && (
        <React.Fragment>
          <Chat name={username} messages={messages} members={members} key={chatKey} />
          <Divider />
          <div style={{padding: '12px', display: 'flex'}}>
            <TextField variant='filled' label='Message' size='small' style={{flexGrow: 1, marginRight: '12px'}} value={text} onChange={e=>setText(e.target.value)} />
            <Button color='primary' variant='contained' disableElevation endIcon={<Icon>send</Icon>} onClick={sendMessage}>SEND</Button>
          </div>
        </React.Fragment>
      )}
    </Paper>
  );
}

export default LiveChat;
