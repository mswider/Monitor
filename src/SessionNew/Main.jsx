import React, { useState, useEffect, useMemo } from 'react';
import { useChannel, usePresenceChannel } from '../PusherClient';
import Grid from '@mui/material/Grid';
import ActivityList, { USER } from './ActivityList';

function Main({ device, sessions, session, error, magicNumber }) {
  const [classroomMembers, setClassroomMembers] = useState({});
  const [monitored, setMonitored] = useState([]);
  const [subscribed, setSubscribed] = useState({ presence: false, chat: false, control: false });
  const [controlName, setControlName] = useState();
  const { channel: presenceChannel, members: presenceMembers } = usePresenceChannel(`presence-session.${session}`);
  const { channel: chatChannel } = usePresenceChannel(`presence-student.${device.aid}-session.${session}`);
  const controlChannel = useChannel(controlName);

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
      const newPerson = {
        aid: aid,
        name: name,
        type: type === 'student' ? ( monitoredIds.includes(aid) ? USER.monitored : USER.student ) : USER.admin,
        selected: device.aid === aid,
        isVerified: verifiedSids.includes(sid)
      };
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
      const { people } = await req.json();
      setClassroomMembers(people);
    };
    const getMonitored = async () => {
      const req = await fetch(`./api/devices/sessions`);
      if (!req.ok) return;
      const devices = await req.json().then(e => Object.values(e.devices));
      setMonitored(devices);
    };

    Promise.all([ getPeople(), getMonitored() ]);
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

    chatChannel.bind('client-chat-message', e => console.log('client-chat-message:', e));
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
    } else {
      console.log('Skipping connection to control channel: device is not verified');
    }
  }, []);

  return (
    <Grid container>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <ActivityList online={participants.online} offline={participants.offline} />
      </Grid>
    </Grid>
  );
}

export default Main;