import React, { useState, useEffect, useMemo } from 'react';
import { useChannel, usePresenceChannel } from '../PusherClient';
import Grid from '@mui/material/Grid';
import ActivityList, { USER } from './ActivityList';
import Box from '@mui/material/Box';
import Chat from './Chat';
import { SessionProvider } from './Provider';

function Main({ device, sessions, session, error, magicNumber }) {
  const [classroomMembers, setClassroomMembers] = useState({});
  const [monitored, setMonitored] = useState([]);
  const [messages, setMessages] = useState([]);
  const [subscribed, setSubscribed] = useState({ presence: false, chat: false, control: false });
  const [controlName, setControlName] = useState();
  const { channel: presenceChannel, members: presenceMembers } = usePresenceChannel(`presence-session.${session}`);
  const { channel: chatChannel, members: chatMembers } = usePresenceChannel(`presence-student.${device.aid}-session.${session}`);
  const controlChannel = useChannel(controlName);

  const showChat = (message) => {
    setMessages((messages) => [...messages, message]);
  };

  const participants = useMemo(() => {
    const members = Object.values(presenceMembers).filter(e => !e.capabilities?.split(',').includes(magicNumber));
    const membersObj = Object.fromEntries(members.map(e => ([e.aid, e])));
    const allPeople = { ...classroomMembers, ...membersObj };
    const onlineList = Object.keys(membersObj);
    const monitoredIds = monitored.map(device => device.aid);
    const verifiedSids = monitored.filter(device => device.isVerified).map(device => device.sid);

    const online = [];
    const offline = [];
    for (const { name, type, aid, sid } of Object.values(allPeople)) {
      const isMonitored = monitoredIds.includes(aid);
      const newPerson = {
        aid: aid,
        name: name,
        type: type === 'student' ? ( isMonitored ? USER.monitored : USER.student ) : USER.admin,
        selected: device.aid === aid,
        isVerified: verifiedSids.includes(sid)
      };
      if (type === 'student' && isMonitored) newPerson.sid = monitored.find(e => e.aid === aid).sid;
      if (onlineList.includes(aid.toString())) {
        online.push(newPerson);
      } else {
        offline.push(newPerson);
      }
    }

    return { online, offline };
  }, [classroomMembers, presenceMembers, monitored]);
  
  useEffect(() => {
    const getPeople = async () => {
      const { classroomId } = sessions[session];
      const req = await fetch(`./api/classrooms/${classroomId}?withAdmins=true`);
      if (!req.ok) return;
      await req.json().then(e => e.people).then(setClassroomMembers);
    };
    const getMonitored = async () => {
      const req = await fetch(`./api/devices/sessions`);
      if (!req.ok) return;
      await req.json().then(e => Object.values(e.devices)).then(setMonitored);
    };
    const getMessages = async () => {
      const req = await fetch(`./api/pusher/history/${session}`, { headers: { 'Auth': device.id } });
      if (!req.ok) return;
      await req.json().then(e => e.messages).then(setMessages);
    };

    Promise.all([ getPeople(), getMonitored(), getMessages() ]);
  }, [session]);
  useEffect(() => {
    if (!presenceChannel) return;
    console.log('presence:', presenceChannel);
    window.monitorPresenceChannel = presenceChannel;

    presenceChannel.bind('pusher:subscription_error', err => {
      console.warn(`Pusher ${err.type} in presence:\n${err.error}`);
      error();
    });
    presenceChannel.bind('pusher:subscription_succeeded', () => setSubscribed(e => ({ ...e, presence: true })));
  }, [presenceChannel]);
  useEffect(() => {
    if (!chatChannel) return;
    console.log('chat:', chatChannel);
    window.monitorChatChannel = chatChannel;

    chatChannel.bind('pusher:subscription_error', err => {
      console.warn(`Pusher ${err.type} in chat:\n${err.error}`);
      error();
    });
    chatChannel.bind('pusher:subscription_succeeded', () => setSubscribed(e => ({ ...e, chat: true })));

    chatChannel.bind('client-chat-message', showChat);
  }, [chatChannel]);
  useEffect(() => {
    if (!controlChannel) return;
    console.log('control:', controlChannel);
    window.monitorControlChannel = controlChannel;

    controlChannel.bind('pusher:subscription_error', err => {
      console.warn(`Pusher ${err.type} in control:\n${err.error}`);
      error();
    });
    controlChannel.bind('pusher:subscription_succeeded', () => setSubscribed(e => ({ ...e, control: true })));

    controlChannel.bind('client-state-set', e => console.log('client-state-set:', e));
  }, [controlChannel]);

  useEffect(() => {
    if (device.isVerified) {
      setControlName(`private-subaccount.${device.sid}`);
    }
  }, []);

  return (
    <SessionProvider session={sessions[session]} device={device}>
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Grid item xs={12} sx={{ pt: '0 !important' }}>
          <Box sx={(theme) => theme.mixins.toolbar} />
        </Grid>
        <Grid
          container
          sx={{ p: 1, pt: 0, minHeight: '0px', flexGrow: '1', mt: 0 }}
          spacing={1}
        >
          <Grid
            item
            xs={12}
            sm={6}
            md={4}
            lg={3}
            xl={2}
            sx={{ overflowY: 'auto', height: '100%' }}
          >
            <ActivityList
              online={participants.online}
              offline={participants.offline}
              session={session}
            />
          </Grid>
          <Grid
            item
            xs={12}
            sm={6}
            md={8}
            lg={9}
            xl={10}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            }}
            style={{ paddingTop: 0 }}
          >
            <Chat
              members={chatMembers}
              magicNumber={magicNumber}
              messages={messages}
              showChat={showChat}
              presence={presenceChannel}
              chatChannel={chatChannel}
            />
          </Grid>
        </Grid>
      </Box>
    </SessionProvider>
  );
}

export default Main;