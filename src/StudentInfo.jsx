import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Classrooms } from './Dashboard.jsx';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';

function StudentInfo() {
  const isInit = useRef(true);
  let { studentAID } = useParams();
  const allClasses = useRef();
  const classHistory = useRef();
  const studentClassrooms = useRef([]);
  const updateInterval = useRef();
  const [studentInfo, setStudentInfo] = useState();
  const [chatStatus, setChatStatus] = useState({});
  const [chats, setChats] = useState({});

  const loadChatData = async aid => {
    await fetch(`./api/chat/studentStatus/${aid}`).then(res => res.json()).then(data => setChatStatus(data));
    await fetch(`./api/chat/messages/${aid}`).then(res => res.json()).then(data => {
      //Only store sessions where messages were sent
      setChats(Object.fromEntries(Object.keys(data).filter(e => data[e].length != 0).map(sessionId => ([ sessionId, data[sessionId] ]))));
    });
  };

  const updateChatStatus = aid => {
    updateInterval.current = setInterval(async () => {
      await loadChatData(aid);
      setChatStatus(chatStatus => { //wack
        if (chatStatus.code == 2) clearInterval(updateInterval.current);
        return chatStatus;
      })
    }, 5000);
  };

  const ClassroomViewer = useMemo(() => //Prevent classrooms from changing color while we're updating chats bc it looks weird
    <Classrooms classrooms={studentClassrooms.current} history={classHistory.current} forStudentPage color='RANDOM' />, 
    [studentClassrooms.current, classHistory.current]
  );

  useEffect(async () => {
    if (isInit.current) {
      allClasses.current = await fetch('./info/classrooms').then(res => res.json());
      classHistory.current = await fetch('./info/classHistory').then(res => res.json());
      isInit.current = false;
    }
    setStudentInfo(null);
    clearInterval(updateInterval.current);

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
        await fetch(`./info/people/${accountAID}`).then(res => res.json()).then(data => setStudentInfo(data));
      }
    }
  }, [studentAID]);
  useEffect(() => () => clearInterval(updateInterval.current), []); //Clear chat update interval on unmount
  return (
    <Container style={{marginTop: '64px', paddingTop: '24px'}}>
      {studentInfo ? (
        <React.Fragment>
          <Typography variant='h1' style={{textAlign: 'center'}}>{studentInfo.name}</Typography>
          <Typography variant='h5' style={{textAlign: 'center', marginBottom: '20px', color: '#757575'}}>{studentInfo.email}</Typography>
          <Typography variant='h4' style={{marginBottom: '5px'}}>Classes: <span style={{color: '#757575'}}>{studentClassrooms.current.length}</span></Typography>
          <Divider />
          {ClassroomViewer}
          <div style={{display: 'flex', alignItems: 'flex-end'}}>
            <Typography variant='h4' style={{marginBottom: '5px'}}>Chats: <span style={{color: '#757575'}}>{Object.keys(chats).length}</span></Typography>
            <ChatStatus status={chatStatus} aid={studentInfo.aid} update={updateChatStatus} />
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

function ChatStatus(props) {
  const [message, setMessage] = useState({text: '', color: '#000'});
  const [workersAvailable, setWorkersAvailable] = useState({state: false, needsPermissionChange: false});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [updating, setUpdating] = useState(false);


  useEffect(async () => {
    if (props.status.code != 2) {
      const workers = await fetch('./info/workers').then(res => res.json()).then(data => data.workers);
      const comprandInfo = await fetch('./setup/comprands').then(res => res.json());
      const accountInfo = comprandInfo.find(e => e.data.accountId == props.aid);
      if (accountInfo) {
        setWorkersAvailable({state: true, needsPermissionChange: false, knownComprand: accountInfo.id});
      } else {
        const filtered = workers.filter(e => e.busy == false);
        setWorkersAvailable({state: filtered.length != 0, needsPermissionChange: true, workers: filtered, comprands: comprandInfo});
      }
    }
  }, []);
  useEffect(() => {
    const color = ['#b00020', '#ffab00', '#388e3c'][props.status.code];
    let content = '';
    const sessionsNeeded = props.status.sessionsNeeded;
    if (props.status.code == 0) content = `No chats have been recorded yet, and ${sessionsNeeded} session${sessionsNeeded != 1 ? 's still need' : ' still needs'} to be recorded.`;
    if (props.status.code == 1) content = `Some chats have been recorded, and ${sessionsNeeded} session${sessionsNeeded != 1 ? 's are' : ' is'} left to record.`;
    if (props.status.code == 2) content = 'All chat sessions have been recorded.';
    setMessage({text: content, color: color});
  }, [props.status]);

  const getComprandInfo = (comprand, comprandInfo) => {
    return comprandInfo.filter(e => e.id == comprand)[0].data;
  };
  const doChatUpdate = comprand => {
    fetch(`./api/chat/updateStudent/?comprand=${comprand}&aid=${props.aid}`);
    setWorkersAvailable({...workersAvailable, state: false});
    setUpdating(true);
    props.update(props.aid);
  }

  //  We put the disabled button within a div because disabled elements don't fire events, making the tooltip not show up
  return (
    <div style={{display: 'grid', placeItems: 'center', flexGrow: '1'}}>
      <Paper variant='outlined' style={{display: 'flex', margin: '10px', padding: '10px 15px', alignItems: 'center'}}>
        <Typography variant='h5' style={{color: message.color, width: 'fit-content', marginRight: props.status.code != 2 ? '12px' : '0px'}}>{message.text}</Typography>
        {props.status.code != 2 && (
          workersAvailable.state ? (
            <React.Fragment>
              {!workersAvailable.needsPermissionChange ? (
                <Button variant='outlined' onClick={() => doChatUpdate(workersAvailable.knownComprand)}>Update</Button>
              ) : (
                <React.Fragment>
                  <Button variant='outlined' onClick={() => setDialogOpen(true)}>Update</Button>
                  <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
                    <DialogTitle>Select a Worker</DialogTitle>
                    <List>
                      {workersAvailable.workers.map(worker => 
                        <ListItem button key={worker.id} onClick={() => {
                          doChatUpdate(worker.id);
                          setDialogOpen(false);
                        }}>
                          <ListItemText>
                            {getComprandInfo(worker.id, workersAvailable.comprands).emailOnFile}
                          </ListItemText>
                        </ListItem>  
                      )}
                    </List>
                  </Dialog>
                </React.Fragment>
              )}
            </React.Fragment>
          ) : (
            <Tooltip title={updating ? 'Update is in progress' : 'No workers available to record chats'} placement='top' arrow>
              <div>
                <Button variant='outlined' disabled>
                  {updating ? 'Updating...' : 'Update'}
                  {updating && <CircularProgress size={20} style={{margin: '5px', marginLeft: '10px'}} />}
                </Button>
              </div>
            </Tooltip>
          )
        )}
      </Paper>
    </div>
  );
}

export default StudentInfo;
