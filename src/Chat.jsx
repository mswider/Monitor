import React, { useState, useEffect, useRef } from 'react';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import Icon from '@mui/material/Icon';

function Chat(props) {
  const [members, setMembers] = useState({});
  const bubbleRef = useRef(null);

  useEffect(() => {
    let final = {};
    let j = 0;
    for (var i in props.members) {
      if (props.members[i].type == 'admin') {
        final[props.members[i].aid] = props.members[i];
        final[props.members[i].aid].color = colors[j % colors.length];
        j++;
      }
    }
    setMembers(final);
  }, props.members);
  useEffect(() => {
    if (bubbleRef.current && !props.noAutoScroll) bubbleRef.current.scrollIntoView();
  });

  const colors = ['#0097a7','#43a047','#ff5722','#9c27b0','#039be5','#f44336','#2196f3','#009688','#673ab7','#e91e63','#3f51b5'];
  const formattedDate = (time) => {
    const date = new Date(time * 1000);
    return date.toLocaleTimeString();
  }
  const getInitials = (name) => {
    const splitName = name.split(' ');
    let initials = '';
    for (var i in splitName) {
      initials = initials + splitName[i][0].toUpperCase();
    }
    return initials;
  };
  return (
    <React.Fragment>
      <div style={{padding: '12px', textAlign: 'center'}}>
        <Typography variant='h5'>{props.name}</Typography>
      </div>
      <Divider />
      <div style={{flexGrow: 1, overflowY: 'auto', padding: '12px'}}>
        <React.Fragment>
          {props.messages.length == 0 && (
            <Typography variant='h4' style={{color: '#757575', margin: '1em 0', fontStyle: 'italic', textAlign: 'center'}}>No Messages Sent</Typography>
          )}
          {props.messages.length != 0 && (
            <div style={{display: 'flex', flexDirection: 'column'}}>
              {props.messages.map((message, index) =>
                <div key={message.payload.messageId} 
                  style={{alignSelf: message.sender.type == 'admin' ? 'flex-start' : 'flex-end', display: message.sender.type == 'admin' ? 'flex' : 'block', marginBottom: '6px', marginTop: '6px'}} 
                  ref={index + 1 == props.messages.length ? bubbleRef : undefined}
                >
                  {message.sender.type=='admin' && (
                    <React.Fragment>
                      {members[message.sender.id] ? (
                        <Tooltip title={members[message.sender.id].name}>
                          <Avatar style={{marginRight: '12px', backgroundColor: members[message.sender.id].color}}>{getInitials(members[message.sender.id].name)}</Avatar>
                        </Tooltip>
                      ) : (
                        <Tooltip title='Unknown User'>
                          <Avatar style={{marginRight: '12px'}}>U</Avatar>
                        </Tooltip>
                      )}
                    </React.Fragment>
                  )}
                  <div style={message.sender.type=='admin'?{display: 'flex', flexDirection: 'column'}:{}}>
                    <div style={{
                        padding: '8px', 
                        borderRadius: '16px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        backgroundColor: message.sender.type == 'admin' ? ( message.payload.type == 'announcement' ? '#FFECB3' : '#E0E0E0' ) : '#64B5F6', 
                        borderBottomLeftRadius: message.sender.type == 'admin' ? '4px' : '16px', 
                        borderBottomRightRadius: message.sender.type == 'admin' ? '16px' : '4px'
                      }}>
                      {message.payload.type == 'announcement' && <Icon style={{marginRight: '8px'}}>announcement</Icon>}
                      <Typography variant='h6'>{message.payload.content}</Typography>
                    </div>
                    <p style={{fontFamily: 'Roboto', margin: '5px 0', fontSize: '0.9em', float: message.sender.type=='admin'?'left':'right'}}>{formattedDate(message.timestamp)}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </React.Fragment>
      </div>
    </React.Fragment>
  );
}

export default Chat;
