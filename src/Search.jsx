import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import Icon from '@material-ui/core/Icon';
import Container from '@material-ui/core/Container';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemText from '@material-ui/core/ListItemText';

function UserSearch() {
  const [searchText, setSearchText] = useState('');

  const inputStyle = {
    width: '100%',
    outline: 'none',
    border: 'none',
    borderBottom: '#545454 solid 2px',
    fontFamily: 'Roboto',
    fontSize: '24px',
    padding: '10px 30px',
    boxSizing: 'border-box'
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
      <Container maxWidth='md' style={{marginTop: '64px', paddingTop: '24px'}}>
        <div style={{margin: '0 auto', width: '75%'}}>
          <Icon style={{position: 'absolute', transform: 'translate(0, 12px)', color: '#484848'}}>search</Icon>
          <input type='text' placeholder='Search' style={inputStyle} value={searchText} onChange={e => setSearchText(e.target.value)} />
          <SearchResults text={searchText} />
        </div>
      </Container>
    </React.Fragment>
  );
}

function SearchResults(props) {
  const [studentArray, setStudentArray] = useState([]);
  const [studentsFound, setStudentsFound] = useState([]);
  const [classrooms, setClassrooms] = useState([]);

  useEffect(() => {
    fetch('/info/people').then(res => res.json()).then(data => {
      const peopleArray = Object.keys(data).map(e => data[e]);
      const students = peopleArray.filter(e => e.type == 'student');
      setStudentArray(students);
      setStudentsFound(students);
    });
    fetch('/info/classrooms').then(res => res.json()).then(data => {
      const classes = Object.keys(data).map(e => data[e]);
      setClassrooms(classes);
    });
  }, []);

  const getClassNumForStudent = (aid) => {
    return classrooms.filter(e => e.people.includes(aid)).length;
  };
  useEffect(() => {
    if (props.text.length != 0) {
      try { // The regex broke everything when I put in a wildcard (*) so I'm adding this
        const regex = new RegExp(props.text, 'i');  //Case-insensitive is more user-friendly and regex is nice for me to have
        setStudentsFound(studentArray.filter(e => e.name.search(regex) != -1));
      } catch (e) {
        setStudentsFound([]);
        console.error('Could not use regex against student names: ' + e);
      }
    } else {
      setStudentsFound(studentArray);
    }
  }, [props.text]);
  return (
    <React.Fragment>
      {studentsFound.length != 0 ? (
        <List>
          {studentsFound.map(e =>
            <Link to={'/studentInfo/' + e.aid} style={{textDecoration: 'none', color: 'unset'}} key={e.aid}>
              <ListItem button>
                <ListItemText primary={e.name} secondary={
                  <React.Fragment>
                    <Typography variant='body2'>{e.email}</Typography>
                    <Typography variant='body2'>Classes: {getClassNumForStudent(e.aid)}</Typography>
                  </React.Fragment>
                } />
              </ListItem>
            </Link>
          )}
        </List>
      ) : (
        <Typography variant='h4' style={{color: '#757575', margin: '1em 0', fontStyle: 'italic', textAlign: 'center'}}>No Users Found</Typography>
      )}
    </React.Fragment>
  );
}

export default UserSearch;
