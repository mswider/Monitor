import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import Pusher from 'pusher-js';
import { v1 as uuidv1 } from 'uuid';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import Icon from '@material-ui/core/Icon';
import Paper from '@material-ui/core/Paper';
import Divider from '@material-ui/core/Divider';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';
import Chat from './Chat.jsx';

function LiveChat() {
  let { email } = useParams();
  const [username, setUsername] = useState('Connecting...');
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState({});
  const [text, setText] = useState('');
  const [pusherInfo, setPusherInfo] = useState({});
  const [status, setStatus] = useState('loading');
  const [chatKey, setChatKey] = useState(uuidv1()); //Fixes a bug where prop changes aren't reacted to
  const pusherRef = useRef();
  useEffect(async () => {
    fetch('./info/people').then(res => res.json()).then(setMembers);
    const comprandResponse = await fetch('./setup/comprands').then(res => res.json()).then(data => data.filter(e => e.data.emailOnFile == email)[0]);
    if (comprandResponse != null) {
      const liveSessions = await fetch('./info/classes').then(res => res.json()).then(data => data.filter(e => e.id == comprandResponse.id)[0]).then(person => person.sessions);
      if (liveSessions.length != 0) {
        setStatus('ok');
        const settings = await fetch('./info/pusher').then(res => res.json());
        pusherRef.current = new Pusher(settings.key, {cluster: 'goguardian', authEndpoint: '/pusher/authproxy', auth: {headers: {'Authorization': comprandResponse.id}, params: {version: settings.version, liveStateVersion: settings.ggVersion}}});
        const classIndex = 0;
        const channelNameTemp = `presence-student.${comprandResponse.data.accountId}-session.${liveSessions[classIndex].id}`;
        setPusherInfo({channel: channelNameTemp, studentId: comprandResponse.data.accountId, sessionId: liveSessions[classIndex].id, classroomId: liveSessions[classIndex].classroomId}); //Allows us to send messages outside of this hook
        const channel = pusherRef.current.subscribe(channelNameTemp);
        channel.bind('pusher:subscription_succeeded', () => {
          setUsername(`${channel.members.me.info.name} | ${liveSessions[classIndex].classroomName}`);
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
        const chatHistory = await fetch(`./pusher/history/${liveSessions[0].id}`, {headers: {'Auth': comprandResponse.id}}).then(res => res.json()).then(data => data.messages);
        setMessages(chatHistory);
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
          {status == 'no_classes' && (
            <Typography variant='h3' style={{color: '#757575', margin: 'auto', fontStyle: 'italic'}}>User Isn't In a Class</Typography>
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
        </React.Fragment>
      </Paper>
    </React.Fragment>
  );
}

export default LiveChat;
