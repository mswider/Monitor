import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

function SessionHistory(props) {
  const getDiff = (start, end) => {
    const seconds = Math.floor((end - start) / 1000);
    const time = Math.floor(seconds / 60) + ':' + ((seconds % 60) >= 10?(seconds % 60):'0' + (seconds % 60).toString());
    return time;
  };
  return (
    <React.Fragment>
      {props.history.length == 0 ? (
        <Typography variant='h6' style={{color: '#757575', margin: '1em 0', fontStyle: 'italic'}}>No Past Sessions</Typography>
      ) : (
        <Table style={{width: '100%'}}>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell align='center'>Date</TableCell>
              <TableCell align='right'>Duration</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {props.history.map((e, index) =>
              <TableRow key={e.id}>
                <TableCell style={index+1==props.history.length?{borderBottom:'none'}:{}}>
                  <Link to={`/classrooms/${e.classroomId}`} style={{color: 'unset', textDecoration: 'none'}}>
                    {e.name}
                  </Link>
                </TableCell>
                <TableCell align='center' style={index+1==props.history.length?{borderBottom:'none'}:{}}>{e.date}</TableCell>
                <TableCell align='right' style={index+1==props.history.length?{borderBottom:'none'}:{}}>{e.endMs ? getDiff(e.startMs, e.endMs) : 'In Progress'}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </React.Fragment>
  );
}

export default SessionHistory;
