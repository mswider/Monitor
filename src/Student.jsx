import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Classrooms } from './Dashboard.jsx';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import SelectDevice from './components/SelectDevice';
import { post } from './utils';

function StudentInfo() {
  const isInit = useRef(true);
  let { studentAID } = useParams();
  const allClasses = useRef();
  const classHistory = useRef();
  const studentClassrooms = useRef([]);
  const [studentInfo, setStudentInfo] = useState();
  const [chatStatus, setChatStatus] = useState({ code: 1, sessionsNeeded: 1 });
  const [chats, setChats] = useState({});
  const [updating, setUpdating] = useState(false);
  const [devices, setDevices] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const polling = useRef();
  const assignPolling = useRef();

  const loadChatData = async aid => {
    await fetch(`./api/chat/studentStatus/${aid}`).then(res => res.json()).then(data => setChatStatus(data));
    await fetch(`./api/chat/messages/${aid}`).then(res => res.json()).then(data => {
      //Only store sessions where messages were sent
      setChats(Object.fromEntries(Object.keys(data).filter(e => data[e].length != 0).map(sessionId => ([ sessionId, data[sessionId] ]))));
    });
  };

  const updateChats = async deviceID => {
    setUpdating(true);
    const { taskID } = await post('./api/chat/update', { aid: studentInfo.aid }, { device: deviceID }).then(res => res.json());
    polling.current = setInterval(async () => {
      const { completed } = await fetch(`./api/tasks/${taskID}`).then(res => res.json());
      if (completed) {
        clearInterval(polling.current);
        setUpdating(false);
        await loadChatData(studentInfo.aid);
      }
    }, 2500);
  };
  const assign = async deviceID => {
    setAssigning(true);
    const { taskID } = await post('./api/devices/assign', { name: studentInfo.name, email: studentInfo.email }, { device: deviceID }).then(res => res.json());
    assignPolling.current = setInterval(async () => {
      const { completed } = await fetch(`./api/tasks/${taskID}`).then(res => res.json());
      if (completed) {
        clearInterval(assignPolling.current);
        setAssigning(false);
        await fetch('./api/devices/list').then(res => res.json()).then(Object.entries).then(setDevices);
      }
    }, 2500);
  };

  const ClassroomViewer = useMemo(() => //Prevent classrooms from changing color while we're updating chats bc it looks weird
    <Classrooms classrooms={studentClassrooms.current} history={classHistory.current} forStudentPage color='RANDOM' />, 
    [studentClassrooms.current, classHistory.current]
  );

  const filteredDevices = useMemo(() =>
    devices.filter(([_, device]) => !device.inactive && !device.locked && studentInfo && device.info.accountId != studentInfo.aid),
    [studentInfo, devices]
  );

  useEffect(async () => {
    if (isInit.current) {
      allClasses.current = await fetch('./info/classrooms').then(res => res.json());
      classHistory.current = await fetch('./info/classHistory').then(res => res.json());
      isInit.current = false;
    }
    setStudentInfo(null);
    setUpdating(false);
    setAssigning(false);
    setDialogOpen(false);
    clearInterval(polling.current);
    clearInterval(assignPolling.current);

    const accountAID = Number(studentAID);  //This is a string but we need it as a number
    if (!isNaN(accountAID)) {  //Needed to prevent errors if someone makes the param an actual string Ex: "hello_world"
      const classesWithStudent = Object.fromEntries(Object.keys(allClasses.current).filter(e => allClasses.current[e].people.includes(accountAID)).map(e => ([ e, allClasses.current[e] ])));

      if (Object.keys(classesWithStudent).length != 0) {
        studentClassrooms.current = Object.keys(classesWithStudent).map(classroom => ({
          id: classroom,
          name: classesWithStudent[classroom].name,
          admins: Object.keys(classesWithStudent[classroom].admins).length,
          students: classesWithStudent[classroom].people.length,
          sessions: classHistory.current.filter(e => e.classroomId == classroom).length
        }));
        await loadChatData(accountAID);
        await fetch('./api/devices/list').then(res => res.json()).then(Object.entries).then(setDevices);
        await fetch(`./info/people/${accountAID}`).then(res => res.json()).then(setStudentInfo);
      }
    }
  }, [studentAID]);
  useEffect(() => () => {
    clearInterval(polling.current); 
    clearInterval(assignPolling.current);
  }, []); //Clear update intervals on unmount
  return (
    <Container style={{marginTop: '64px', paddingTop: '24px'}}>
      {studentInfo ? (
        <React.Fragment>
          <Box sx={{ mb: 3 }}>
            <Typography variant='h2'>{studentInfo.name}</Typography>
            <Typography variant='h5' sx={{ color: 'text.secondary' }} gutterBottom>{studentInfo.email}</Typography>
            <Typography variant='h6' gutterBottom>
              {studentClassrooms.current.length} Class{studentClassrooms.current.length != 1 ? 'es' : ''}
              {Object.keys(chats).length != 0 && ` • ${Object.keys(chats).length} Recorded Conversation${Object.keys(chats).length != 1 ? 's' : ''}`}
            </Typography>
            {!devices.find(([_, { info }]) => info.accountId == studentInfo.aid) && (
              <>
                <Tooltip title={assigning ? 'Update is in progress' : ( filteredDevices.length == 0 ? 'No devices available to be assigned' : '' )} placement='top' arrow>
                  <Box sx={{ maxWidth: 'fit-content' }}>
                    <Button variant="outlined" size="small" disabled={assigning || filteredDevices.length == 0} onClick={() => setDialogOpen(true)}>
                      {assigning ? 'Updating...' : 'Monitor'}
                      {assigning && <CircularProgress size={16} style={{margin: '5px', marginLeft: '10px'}} />}
                    </Button>
                  </Box>
                </Tooltip>
                <SelectDevice dialogOpen={dialogOpen} closeDialog={() => setDialogOpen(false)} devices={filteredDevices} onSelect={assign} />
              </>
            )}
          </Box>
          <Typography variant='h4' style={{marginBottom: '5px'}}>Classes: <span style={{color: '#757575'}}>{studentClassrooms.current.length}</span></Typography>
          <Divider />
          {ClassroomViewer}
          <div style={{display: 'flex', alignItems: 'flex-end'}}>
            <Typography variant='h4' style={{marginBottom: '5px'}}>Chats: <span style={{color: '#757575'}}>{Object.keys(chats).length}</span></Typography>
            <ChatStatus code={chatStatus.code} sessionsNeeded={chatStatus.sessionsNeeded} updating={updating} aid={studentInfo.aid} update={updateChats} allDevices={devices} />
          </div>
          <Divider />
          <div style={{padding: '12px', display: 'flex', flexWrap: 'wrap'}}>
            {Object.keys(chats).reverse().map(e =>
              <Link to={`/chat/${e}/${studentInfo.aid}`} key={e}>
                <Paper variant='outlined' style={{display: 'inline-block', padding: '8px', paddingTop: '4px', margin: '4px'}}>
                  <Typography variant='h6' style={{textAlign: 'center'}}>{classHistory.current.find(j => j.id == e).name}</Typography>
                  <Divider style={{marginBottom: '5px'}} />
                  <Typography variant='h6'>Date: <span style={{fontWeight: '400'}}>{classHistory.current.find(j => j.id == e).date}</span></Typography>
                  <Typography variant='h6'>Messages: <span style={{fontWeight: '400'}}>{chats[e].length}</span></Typography>
                </Paper>
              </Link>
            )}
          </div>
        </React.Fragment>
      ) : (
        <Typography variant='h3' style={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#757575', fontStyle: 'italic'}}>Student Doesn't Exist</Typography>
      )}
    </Container>
  );
}

function ChatStatus({ code, sessionsNeeded, updating, aid, update, allDevices }) {
  const [message, setMessage] = useState({text: '', color: '#000'});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [devices, setDevices] = useState([]);

  const handleClick = () => {
    const deviceForAccount = devices.find(([_, device]) => device.info.accountId == aid);
    if (deviceForAccount) {
      update(deviceForAccount[0]);
    } else {
      setDialogOpen(true);
    }
  };
  const refreshDevices = arr => {
    setDevices(arr.filter(([_, device]) => !device.inactive && (!device.locked || device.info.accountId == aid)));
  };

  useEffect(() => {
    const color = ['#b00020', '#ffab00', '#388e3c'][code];
    let content = '';
    if (code == 0) content = `No chats have been recorded yet, and ${sessionsNeeded} session${sessionsNeeded != 1 ? 's still need' : ' still needs'} to be recorded.`;
    if (code == 1) content = `Some chats have been recorded, and ${sessionsNeeded} session${sessionsNeeded != 1 ? 's are' : ' is'} left to record.`;
    if (code == 2) content = 'All chat sessions have been recorded.';
    setMessage({text: content, color});
  }, [code, sessionsNeeded]);

  useEffect(async () => {
    setDialogOpen(false);
  }, [aid]);
  useEffect(() => {
    refreshDevices(allDevices);
  }, [allDevices, aid]);

  //  We put the disabled button within a div because disabled elements don't fire events, making the tooltip not show up
  return (
    <div style={{display: 'grid', placeItems: 'center', flexGrow: '1'}}>
      <Paper variant='outlined' style={{display: 'flex', margin: '10px', padding: '10px 15px', alignItems: 'center'}}>
        <Typography variant='h5' style={{color: message.color, width: 'fit-content', marginRight: code != 2 ? '12px' : '0px'}}>{message.text}</Typography>
        {code != 2 && (
          <>
            <Tooltip title={updating ? 'Update is in progress' : ( devices.length == 0 ? 'No devices available to record chats' : '' )} placement='top' arrow>
              <div>
                <Button variant='outlined' disabled={updating || devices.length == 0} onClick={handleClick}>
                  {updating ? 'Updating...' : 'Update'}
                  {updating && <CircularProgress size={20} style={{margin: '5px', marginLeft: '10px'}} />}
                </Button>
              </div>
            </Tooltip>
            <SelectDevice dialogOpen={dialogOpen} closeDialog={() => setDialogOpen(false)} devices={devices} onSelect={update} />
          </>
        )}
      </Paper>
    </div>
  );
}

export default StudentInfo;
