import React, { useMemo, useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { v1 as uuidv1 } from 'uuid';
import Box from '@mui/material/Box';
import ButtonGroup from '@mui/material/ButtonGroup';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import InputBase from '@mui/material/InputBase';
import Typography from '@mui/material/Typography';
import Icon from '@mui/material/Icon';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Avatars from './Avatars';
import Messages from '../components/Messages';
import { SessionContext } from './Provider';

function Chat({ members, magicNumber, messages, presence, chatChannel, showChat }) {
  const { session, device } = useContext(SessionContext);
  const realMembers = useMemo(() => {
    return Object.fromEntries(
      Object.entries(members).filter(
        ([_, member]) => !member.capabilities?.split(',').includes(magicNumber)
      )
    );
  }, [members, magicNumber]);
  const [message, setMessage] = useState('');
  const disabled = useMemo(() => {
    return message.trim().length === 0;
  }, [message]);

  const command = cmd => {
    presence.trigger('client-set-chat-state', { sessionId: session.id, payload: { command: cmd } });
  };

  const send = () => {
    const mainMessage = {
      acknowledged: false,
      payload: {
        content: message.trim(),
        messageId: uuidv1(),
        type: 'message',
      },
      sender: {
        id: device.aid,
        type: 'student',
      },
      sessionId: session.id,
      studentId: device.aid,
      timestamp: Math.floor(Date.now() / 1000),
    };
    setMessage('');
    showChat(mainMessage);
    chatChannel.trigger('client-chat-message', { ...mainMessage, classroomId: session.classroomId, eventType: 'client-chat-message' });
  };

  return (
    <>
      <Paper
        square
        sx={{ p: 2, borderRadius: '0px 0px 16px 16px' }}
        elevation={1}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Link
            to={`/classrooms/${session.classroomId}`}
            style={{ color: 'unset', textDecoration: 'unset' }}
          >
            <Typography variant="h4">{session.classroomName}</Typography>
          </Link>
          <Avatars people={Object.values(realMembers)} />
        </Box>
        <ButtonGroup
          variant="contained"
          size="small"
          disableElevation
          sx={{ mt: 1 }}
        >
          <Button
            onClick={() => command('enable_chat')}
            startIcon={<Icon>chat_bubble</Icon>}
          >
            Enable
          </Button>
          <Button
            onClick={() => command('disable_chat')}
            startIcon={<Icon>chat_bubble_outline</Icon>}
          >
            Disable
          </Button>
        </ButtonGroup>
      </Paper>
      <Messages conversation={messages} admins={session.admins} />
      <Paper sx={{ p: '4px 8px', display: 'flex', alignItems: 'center' }}>
        <InputBase
          placeholder="Enter a message"
          sx={{ flexGrow: 1 }}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyUp={(e) => e.key === 'Enter' && !disabled && send()}
        />
        <Divider orientation="vertical" sx={{ m: 0.5 }} />
        <IconButton color="primary" disabled={disabled} onClick={send}>
          <Icon>send</Icon>
        </IconButton>
      </Paper>
    </>
  );
}

export default Chat;
