import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Classrooms } from './Dashboard.jsx';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import Icon from '@material-ui/core/Icon';
import Container from '@material-ui/core/Container';
import Divider from '@material-ui/core/Divider';

function StudentInfo() {
  let { studentAID } = useParams();
  const [classHistory, setClassHistory] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [studentInfo, setStudentInfo] = useState('');

  useEffect(async () => {
    const accountAID = Number(studentAID);  //This is a string but we need it as a number
    if (!isNaN(accountAID)) {  //Needed to prevent errors if someone makes the param an actual string Ex: "hello_world"
      const classes = await fetch('/info/classrooms').then(res => res.json());
      let classesWithStudent = {};
      Object.keys(classes).map(e => {
        if (classes[e].people.includes(accountAID)) {
          classesWithStudent[e] = classes[e];
        }
      });

      if (Object.keys(classesWithStudent).length != 0) {
        //Copied from Dashboard.jsx
        const historyResponse = await fetch('/info/classHistory').then(res => res.json());
        setClassHistory(historyResponse);
        let classroomEntries = [];
        Object.keys(classesWithStudent).map(classroom => {
          const classroomEntry = {
            id: classroom,
            name: classesWithStudent[classroom].name,
            admins: Object.keys(classesWithStudent[classroom].admins).length,
            students: classesWithStudent[classroom].people.length,
            sessions: historyResponse.filter(e => e.classroomId == classroom).length
          };
          classroomEntries.push(classroomEntry);
        });
        setClassrooms(classroomEntries);
        fetch(`/info/people/${accountAID}`).then(res => res.json()).then(data => setStudentInfo(data));
      }
    }
  }, [studentAID]);
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
      <Container style={{marginTop: '64px', paddingTop: '24px'}}>
        {classrooms.length != 0 ? (
          <React.Fragment>
            <Typography variant='h1' style={{textAlign: 'center'}}>{studentInfo.name}</Typography>
            <Typography variant='h5' style={{textAlign: 'center', marginBottom: '20px', color: '#757575'}}>{studentInfo.email}</Typography>
            <Typography variant='h4' style={{marginBottom: '5px'}}>Classes: <span style={{color: '#757575'}}>{classrooms.length}</span></Typography>
            <Divider />
            <Classrooms classrooms={classrooms} history={classHistory} forStudentPage color='RANDOM' />
          </React.Fragment>
        ) : (
          <Typography variant='h3' style={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#757575', fontStyle: 'italic'}}>Student Doesn't Exist</Typography>
        )}
      </Container>
    </React.Fragment>
  );
}

export default StudentInfo;
