import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import Icon from '@mui/material/Icon';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/material/Box';
import SessionHistory from './SessionHistory.jsx'

function Dashboard() {
  const [liveChats, setLiveChats] = useState([]);
  const [classHistory, setClassHistory] = useState([]);
  const [classrooms, setClassrooms] = useState([]);

  const updateClasses = async () => {
    const userInfo = await fetch('./setup/comprands').then(res => res.json());
    fetch('./info/classes').then(res => res.json()).then(async (data) => {
      let classesArray = [];
      for (var i in data) {
        if (data[i].sessions.length != 0) {
          let email = '';
          for (var x in userInfo) {
            if (userInfo[x].id == data[i].id) email = userInfo[x].data.emailOnFile;
          }
          const userName = await fetch('./info/people').then(res => res.json()).then(people => {
            const formattedPeople = Object.keys(people).map(e => { return {email: people[e].email, name: people[e].name}; });
            const filteredPerson = formattedPeople.filter(e => e.email == email)[0];
            return filteredPerson ? filteredPerson.name : email;  //Use email as name fallback
          });
          classesArray.push({name: userName, email: email, class: data[i].sessions[0].classroomName});
        }
      }
      setLiveChats(classesArray);
    });
    const historyResponse = await fetch('./info/classHistory').then(res => res.json());
    setClassHistory(historyResponse);
    fetch('./info/classrooms').then(res => res.json()).then(data => {
      let classroomEntries = [];
      Object.keys(data).map(classroom => {
        const classroomEntry = {
          id: classroom,
          name: data[classroom].name,
          admins: Object.keys(data[classroom].admins).length,
          students: data[classroom].people.length,
          sessions: historyResponse.filter(e => e.classroomId == classroom).length
        };
        classroomEntries.push(classroomEntry);
      });
      classroomEntries.sort((a, b) => a.name.length - b.name.length);  //Shorter names first so the box things are more equal height
      setClassrooms(classroomEntries);
    });
  };
  useEffect(() => {
    updateClasses();
    let interval = setInterval(updateClasses, 15000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const widgetStyle = {
    flexGrow: 1,
    flexBasis: 0,
    textAlign: 'center',
    maxHeight: 'calc(100vh - 98px)',  //98px = 64px + 16px + 1px + 1px + 16
    overflowY: 'auto'
  };
  return (
    <div style={{marginTop: '64px', padding: '16px', display: 'flex', alignItems: 'flex-start'}}>
      <Paper variant='outlined' style={{...widgetStyle, marginRight: '8px'}}>
        <Typography variant='h4'>Live Chats</Typography>
        <Divider />
        <LiveChat chats={liveChats} />
      </Paper>
      <Paper variant='outlined' style={{...widgetStyle, margin: '0 8px'}}>
        <Typography variant='h4'>Classes</Typography>
        <Divider />
        <Classrooms classrooms={classrooms} history={classHistory} />
      </Paper>
      <Paper variant='outlined' style={{...widgetStyle, marginLeft: '8px'}}>
        <Typography variant='h4'>Class History</Typography>
        <Divider />
        <SessionHistory history={classHistory} />
      </Paper>
    </div>
  );
}

function Classrooms(props) {
  const getLastStart = id => {
    const startMs = props.history.filter(e => e.classroomId == id)[0].startMs;
    const date = new Date(startMs);
    return date.toLocaleTimeString();
  };
  const colors = ['#0097a7','#43a047','#ff5722','#9c27b0','#039be5','#f44336','#2196f3','#009688','#673ab7','#e91e63','#3f51b5'];

  const randomColor = () => {
    return colors[Math.floor(Math.random() * colors.length)]
  };
  return (
    <div style={{padding: props.classrooms.length==0?'0px':'8px', display: 'flex', flexWrap: 'wrap', justifyContent: !props.forStudentPage?'space-evenly':'flex-start', alignItems: 'flex-start'}}>
      {props.classrooms.length == 0 ? (
        <Typography variant='h6' style={{color: '#757575', margin: '1em 0', fontStyle: 'italic'}}>No Classrooms Recorded</Typography>
      ) : (
        props.classrooms.map((classroom) =>
          <Card variant='outlined' style={{width: '250px', textAlign: 'left', marginBottom: !props.forStudentPage?'8px':'16px', marginRight: !props.forStudentPage?'unset':'16px'}} key={classroom.id}>
            {props.forStudentPage && (
              <CardContent style={{paddingBottom: '10px', backgroundColor: props.color ? (props.color == 'RANDOM' ? randomColor() : props.color) : 'dodgerblue'}}>
                <Typography variant='h5' style={{color: '#fff'}}>{classroom.name}</Typography>
              </CardContent>
            )}
            <CardContent style={props.forStudentPage ? {paddingTop: '0px'} : {}}>
              {!props.forStudentPage && (
                <React.Fragment>
                  <Typography variant='h5'>{classroom.name}</Typography>
                  <Divider />
                </React.Fragment>
              )}
              <Typography style={{fontSize: '16px', marginTop: '5px'}}>Admins: <Box component="span" sx={{fontSize: '14px', color: 'action.active'}}>{classroom.admins}</Box></Typography>
              <Typography style={{fontSize: '16px'}}>Students: <Box component="span" sx={{fontSize: '14px', color: 'action.active'}}>{classroom.students}</Box></Typography>
              <Typography style={{fontSize: '16px'}}>Sessions: <Box component="span" sx={{fontSize: '14px', color: 'action.active'}}>{classroom.sessions}</Box></Typography>
              <Typography style={{fontSize: '16px'}}>Last Start: <Box component="span" sx={{fontSize: '14px', color: 'action.active'}}>{getLastStart(classroom.id)}</Box></Typography>
            </CardContent>
            <CardActions>
              <Link to={`/classrooms/${classroom.id}`} style={{textDecoration: 'none'}}>
                <Button size='small' variant='outlined'>More</Button>
              </Link>
            </CardActions>
          </Card>
        )
      )}
    </div>
  );
}

function LiveChat(props) {
  return (
    <React.Fragment>
      {props.chats.length == 0 ? (
        <Typography variant='h6' style={{color: '#757575', margin: '1em 0', fontStyle: 'italic'}}>No Live Chats</Typography>
      ) : (
        <List component='nav'>
          {props.chats.map((person) =>
            <Link to={`/liveChat/${person.email}`}  key={person.email} style={{color: 'unset', textDecoration: 'unset'}}>
              <Tooltip title={person.class}>
                <ListItem button>
                  <ListItemIcon>
                    <Icon style={{color: '#64dd17'}}>fiber_manual_record</Icon>
                  </ListItemIcon>
                  <ListItemText primary={person.name} />
                </ListItem>
              </Tooltip>
            </Link>
          )}
        </List>
      )}
    </React.Fragment>
  );
}

export { Classrooms };
export default Dashboard;
