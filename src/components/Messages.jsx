import React, { useRef, useEffect, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Avatar from '@mui/material/Avatar';
import Icon from '@mui/material/Icon';

function Messages({ conversation, admins }) {
  const container = useRef();
  const blocks = useMemo(() => {
    let final = [];
    let blockStart = 0;
    for (const [i, { sender }] of conversation.entries()) {
      if (conversation[i + 1]?.sender.id !== sender.id) {
        const range =
          conversation[blockStart].payload.messageId +
          '.' +
          conversation[i].payload.messageId;
        final.push([sender, range, conversation.slice(blockStart, i + 1)]);
        blockStart = i + 1;
      }
    }
    return final;
  }, [conversation]);

  useEffect(() => {
    container.current.scrollTo({
      top: container.current.scrollHeight,
      left: 0,
      behavior: 'smooth',
    });
  }, [blocks]);

  return (
    <Box
      ref={container}
      sx={{
        flexGrow: '1',
        overflowY: 'auto',
        p: '16px 8px',
        display: 'grid',
        gridTemplateColumns: '40px 1fr 8fr 1fr',
        wordWrap: 'break-word',
        gridAutoRows: 'min-content',
        gap: 2,
        alignItems: 'end',
      }}
    >
      {blocks.map(([sender, range, messages]) => (
        <React.Fragment key={range}>
          {sender.type !== 'student' && <Avatar sx={{ gridColumnStart: 1 }} />}
          <Box
            sx={[
              {
                gridColumn: `${sender.type === 'student' ? 3 : 2} / span 2`,
                minWidth: 0,
              },
              sender.type === 'student' && {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'end',
              },
            ]}
          >
            {sender.type !== 'student' && (
              <Typography sx={{ pl: 1 }}>
                {admins[sender.id]?.name || `Unknown (${sender.id})`}
              </Typography>
            )}
            {messages.map(({ payload: { content, type, messageId } }, i) => (
              <Paper
                key={messageId}
                sx={[
                  {
                    p: 1,
                    mt: 0.5,
                    borderRadius: 4,
                    maxWidth: 'fit-content',
                  },
                  sender.type === 'student'
                    ? (theme) => ({
                        bgcolor: 'chat.student',
                        borderBottomRightRadius: theme.spacing(0.5),
                        ...(i > 0 && {
                          borderTopRightRadius: theme.spacing(0.5),
                        }),
                      })
                    : (theme) => ({
                        bgcolor: 'chat.teacher',
                        borderBottomLeftRadius: theme.spacing(0.5),
                        ...(i > 0 && {
                          borderTopLeftRadius: theme.spacing(0.5),
                        }),
                      }),
                  type === 'announcement' && {
                    bgcolor: 'chat.announcement',
                    display: 'flex',
                    alignItems: 'center',
                  },
                ]}
              >
                {type === 'announcement' && (
                  <Icon sx={{ mr: 1 }}>announcement</Icon>
                )}
                <Typography>{content}</Typography>
              </Paper>
            ))}
          </Box>
        </React.Fragment>
      ))}
    </Box>
  );
}

export default Messages;
