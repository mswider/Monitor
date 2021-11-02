const fetch = require('node-fetch');
const convert = require('xml-js');
const Pusher = require('pusher-js');
const notifier = require('node-notifier');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const uuid = require('uuid');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const app = express();
app.use(express.json());
app.use(express.text({type: 'application/x-www-form-urlencoded'}));
app.use(express.static('build'));
const argv = yargs(hideBin(process.argv))
  .option('port', {
    alias: 'p',
    default: 3000,
    describe: 'Configures the port used for the web server'
  }).option('backup', {
    alias: 'b',
    describe: 'Sets file used to restore from backup'
  }).option('verbose', {
    alias: 'v',
    default: false,
    boolean: true,
    describe: 'Sets the logging level to verbose'
  }).option('notify', {
    alias: 'n',
    default: false,
    boolean: true,
    describe: 'Enables desktop notifications'
  }).argv;

let port = argv.port;
let loggingIsVerbose = argv.verbose;
let notificationsEnabled = argv.notify;
let needsConfig = true;
let comprandArray = [];
let workerInfo = [];
let liveClassroomInfo = [];
let oldUpdateInterval = 15000;
let pusherClients = {};
let people = {};
let classrooms = {};
let classroomHistory = [];
let studentChats = {};
let extensionVersion = '1.0.0.0';
const pusherKey = '4e83de4fd19694be0821';
const pusherGGVersion = 6;
const pusherAuthEndpoint = 'https://sakura.goguardian.com/api/v1/auth/ext';
let tempDir = null;  //Do not use this directly

const getTempDir = () => {
  if (tempDir == null) tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ggMonitor-'));
  return tempDir;
};

const getExtVersion = async () => {
  const xml = await fetch('https://ext.goguardian.com/stable.xml').then(data => data.text());
  const json = JSON.parse(convert.xml2json(xml, {compact: true}));
  const data = json.gupdate.app.updatecheck._attributes.version;
  return data;
};
const formatLog = text => {
  console.log((new Date().toLocaleString() + ' - ') + text);
};

formatLog(`Notifications are ${notificationsEnabled?'enabled':'disabled'}`);

if (argv.backup) {
  formatLog('Attempting to restore from backup...');
  if (fs.existsSync(argv.backup)) {
    try {
      const backupObj = JSON.parse(fs.readFileSync(argv.backup));
      if (backupObj.classrooms && backupObj.people && backupObj.classHistory) {
        classrooms = backupObj.classrooms;
        people = backupObj.people;
        classroomHistory = backupObj.classHistory;
        if (backupObj.chatData) studentChats = backupObj.chatData;
        formatLog('Restore from backup was successful');
      } else {
        formatLog('Restore failed, file is missing data');
      }
    } catch {
      formatLog('Restore failed, file is not valid JSON');
    }
  } else {
    formatLog('Restore failed, file provided does not exist');
  }
}

(async () => {
  extensionVersion = await getExtVersion();
  formatLog('Pusher configured with extension version ' + extensionVersion);
})();
setInterval(async () => {
  const version = await getExtVersion();
  if (version != extensionVersion) formatLog('Pusher reconfigured with new extension version, ' + version);
  extensionVersion = version;
  Object.keys(pusherClients).map(e => {
    pusherClients[e].config.auth.params.version = version;
  });
}, ((30) * 60 * 1000));

const changeComprandEmail = async (comprand, email) => {
  if (loggingIsVerbose) formatLog(comprand, email);
  let urlencoded = new URLSearchParams();
  urlencoded.append('email', email);
  const options = {
    method: 'POST',
    headers: {
      'authorization': comprand,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: urlencoded.toString()
  };
  await fetch('https://extapi.goguardian.com/api/v1/ext/nameandemail', options);

  while (true) {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    try {
      const json = await fetch('https://snat.goguardian.com/api/v1/ext/user', {headers: {'Authorization': comprand}}).then(data => data.json());
      if (json.emailOnFile == email) {
        const comprandIndex = comprandArray.indexOf( comprandArray.filter(e => e.id == comprand)[0] );
        comprandArray[comprandIndex].data = json;
        return json;
      }
    } catch (error) {
      if (loggingIsVerbose) formatLog('Email check failed: ' + error);
    }
  }
};

//  ----------  Initial Setup  ----------
app.get('/needsConfig', (req, res) => {
  res.send(needsConfig);
});

//  ----------  Settings  ----------
app.post('/setup/comprands', async (req, res) => {
  let finalArray = [];
  let validArray = [];
  let isValid = true;
  for (var i = 0; i < req.body.length; i++) { //CompRand validation
    if (req.body[i].id != '') {
      let request = await fetch('https://snat.goguardian.com/api/v1/ext/user', {headers: {'Authorization': req.body[i].id}});
      const status = await request.status;
      if (status == 200) {
        finalArray[i] = true;
        const data = await request.json();
        validArray.push({...req.body[i], data: data});
      } else {
        finalArray[i] = false;
        isValid = false;
      }
    } else {
      finalArray[i] = true;
    }
  }
  res.send({valid: isValid, comprands: finalArray});

  if (isValid) {
    needsConfig = false;
    comprandArray = validArray;
    formatLog(`CompRand change applied with ${validArray.length} CompRand${validArray.length!=1?'s':''}.`);
    let workerArray = [];
    let classesArray = [];
    comprandArray.map(comprandEntry => {
      let isMonitored = false;
      if (comprandEntry.mode == 'worker') {
        const workerMatch = workerInfo.filter(e => e.id == comprandEntry.id)[0];
        if (workerMatch) {
          workerArray.push(workerMatch);
          if (workerMatch.data.email) isMonitored = true;  //If a worker has an email, it's monitoring a student
        } else {
          workerArray.push({id: comprandEntry.id, busy: false, data: {}});
        }
      } else {
        isMonitored = true;
      }
      if (isMonitored) {  //Update or add to live class info (Done to persist data)
        const classroomEntry = liveClassroomInfo.filter(e => e.id == comprandEntry.id)[0];
        if (classroomEntry) {
          classesArray.push(classroomEntry);
        } else {
          classesArray.push({id: comprandEntry.id, monitoring: true, sessions: []});
        }
      } else {
        classesArray.push({id: comprandEntry.id, monitoring: false, sessions: []});
      }

      if (!pusherClients[comprandEntry.id]) {
        if (loggingIsVerbose) formatLog('Need new Pusher client for ' + comprandEntry.id);
        makePusherFromComprand(comprandEntry.id);
      }
    });
    workerInfo = workerArray;
    liveClassroomInfo = classesArray;
  }
});
app.get('/setup/comprands', (req, res) => {
  res.send(comprandArray);
});
app.post('/setup/monitoring', (req, res) => {
  res.sendStatus(200);
  if (req.body.interval > 0 && req.body.interval != oldUpdateInterval) {
    clearInterval(monitoringInterval);
    formatLog(`Updated monitoring interval to ${req.body.interval / 1000} second${req.body.interval!=1000?'s':''}`);
    monitoringInterval = setInterval(updateMonitoring, req.body.interval);
    oldUpdateInterval = req.body.interval;
  }
  Object.keys(req.body.data).map(comprand => {
    const workerIndex = workerInfo.indexOf( workerInfo.filter(e => e.id == comprand)[0] );
    const isBusy = (req.body.data[comprand] != '');
    const classIndex = liveClassroomInfo.indexOf( liveClassroomInfo.filter(e => e.id == comprand)[0] );
    workerInfo[workerIndex].busy = isBusy;
    if (isBusy) {
      if (workerInfo[workerIndex].data.email != req.body.data[comprand]) {  //Email changed
        formatLog(`Worker CompRand ${comprand} has been assigned to email ${req.body.data[comprand]}, requesting change...`);
        (async () => {
          await changeComprandEmail(comprand, req.body.data[comprand]);
          formatLog(`Worker CompRand ${comprand} has been changed to email ${req.body.data[comprand]} successfully`);
        })();
      }
      workerInfo[workerIndex].data.email = req.body.data[comprand];
      liveClassroomInfo[classIndex].monitoring = true;
    } else {
      workerInfo[workerIndex].data = {};
      liveClassroomInfo[classIndex].monitoring = false;
      liveClassroomInfo[classIndex].sessions = [];
    }
  });
});

//  ----------  Chat Message Service  ----------
const getChatStatusByAid = (aid, sessionsToCheck) => {  //returns [status, remaining]
  if (studentChats[aid]) {
    const recordedSessions = Object.keys(studentChats[aid]).filter(session => sessionsToCheck.some(e => session == e));
    const sessionsToRecord = sessionsToCheck.filter(session => !recordedSessions.some(e => session == e));
    if (sessionsToRecord.length != 0) {
      if (recordedSessions.length == 0) {  //It is possible that we recorded the messages before the student joined this class
        return [0, sessionsToCheck];
      } else {
        return [1, sessionsToRecord];
      }
    } else {
      return [2, []];
    }
  } else {
    return [0, sessionsToCheck];
  }
};
const updateChatsByComprand = async (comprand, aid, sessions) => {
  const retryDelay = 5000;
  const iterationCap = 200;
  let recordedSessions = [];
  let iterations = 0;
  while (recordedSessions.length != sessions.length) {
    if (iterations >= iterationCap) throw new Error('Iteration cap exceeded');
    if (iterations != 0) {
      if (loggingIsVerbose) formatLog('Failed to grab some sessions, retrying after delay');
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
    const sessionsToRecord = sessions.filter(session => !recordedSessions.some(e => session == e));
    if (loggingIsVerbose) formatLog('Sessions to record: ' + sessionsToRecord + ' ; Already recorded: ' + recordedSessions);
    const promises = sessionsToRecord.map(session => {
      const options = {
        headers: {
          'Authorization': comprand
        }
      };
      const requestData = fetch(`https://snat.goguardian.com/api/v1/ext/chat-messages?sessionId=${session}`, options).then(res => res.json());
      return requestData.then(data => {
        if (!studentChats[aid]) studentChats[aid] = {};
        studentChats[aid][session] = data.messages;
        if (loggingIsVerbose) formatLog(data.messages);
        recordedSessions.push(session);
      });
    });
    await Promise.allSettled(promises);
    iterations++;
  }
};

// Query params: comprand, aid
app.get('/api/chat/updateStudent', async (req, res) => {
  const comprandIsValid = req.query.comprand && comprandArray.map(e => e.id).includes(req.query.comprand);
  const aidIsValid = people[req.query.aid] && people[req.query.aid].type == 'student';
  if (comprandIsValid && aidIsValid) {
    res.sendStatus(202);
    const classesWithStudent = Object.keys(classrooms).filter(e => classrooms[e].people.includes(parseInt(req.query.aid)));
    const sessionsWithStudent = classroomHistory.filter(e => classesWithStudent.includes(e.classroomId.toString())).map(e => e.id);
    const sessionsToRecord = getChatStatusByAid(req.query.aid, sessionsWithStudent)[1];  //Only record sessions we don't have yet
    formatLog(`Updating chats for ${people[req.query.aid].name}, ${sessionsToRecord.length} session${sessionsToRecord.length != 1 ? 's' : ''} will be recorded`);
    try {
      const userInfo = await fetch('https://snat.goguardian.com/api/v1/ext/user', { headers: { 'Authorization': req.query.comprand } }).then(data => data.json());
      if (userInfo.accountId != req.query.aid) {
        if (loggingIsVerbose) formatLog(`Need to update email for comprand to ${people[req.query.aid].email}`);
        await changeComprandEmail(req.query.comprand, people[req.query.aid].email);
        if (loggingIsVerbose) formatLog(`Email successfully updated to ${people[req.query.aid].email}`);
      }
      await updateChatsByComprand(req.query.comprand, parseInt(req.query.aid), sessionsToRecord);
      formatLog(`Finished chat update for ${people[req.query.aid].name}`);
    } catch (e) {
      formatLog(`Failed to update chats for ${people[req.query.aid].name}, try again later`);
      console.log(e);
    }
  } else {
    res.status(400).send({comprandIsValid, aidIsValid});
  }
});
app.get('/api/chat/messages/:accountAID', (req, res) => {
  const chats = studentChats[req.params.accountAID];
  const studentExists = people[req.params.accountAID] != undefined;
  chats ? res.send(chats) : ( studentExists ? res.send({}) : res.sendStatus(400) );
});
app.get('/api/chat/messages', (req, res) => {
  res.send(studentChats);
});
app.get('/api/chat/classroomStatus/:classId', (req, res) => {
  if (classrooms[req.params.classId]) {
    const sessionsForClass = classroomHistory.filter(e => e.classroomId == req.params.classId).map(e => e.id);
    let studentStatus = {};
    classrooms[req.params.classId].people.map(studentAID => {
      studentStatus[studentAID] = getChatStatusByAid(studentAID, sessionsForClass)[0];
    });
    res.send(studentStatus);
  } else {
    res.sendStatus(400);
  }
});
app.get('/api/chat/studentStatus/:studentAID', (req, res) => {
  if (people[req.params.studentAID]) {
    const classesWithStudent = Object.keys(classrooms).filter(e => classrooms[e].people.includes(parseInt(req.params.studentAID)));
    const sessionsWithStudent = classroomHistory.filter(e => classesWithStudent.includes(e.classroomId.toString())).map(e => e.id);
    const status = getChatStatusByAid(req.params.studentAID, sessionsWithStudent);
    res.send({code: status[0], sessionsNeeded: status[1].length});
  } else {
    res.sendStatus(400);
  }
});

//  ----------  Service Info  ----------
app.get('/info/workers', (req, res) => {
  res.send({interval: oldUpdateInterval, workers: workerInfo});
});
app.get('/info/classes', (req, res) => {
  res.send(liveClassroomInfo);
});
app.get('/info/classrooms', (req, res) => {
  res.send(classrooms);
});
app.get('/info/classhistory', (req, res) => {
  res.send(classroomHistory);
});
app.get('/info/people/:accountAID', (req, res) => {
  const person = people[req.params.accountAID];
  person ? res.send(person) : res.sendStatus(404);
});
app.get('/info/people', (req, res) => {
  res.send(people);
});

//  ----------  Pusher Chat Internals  ----------
app.get('/info/pusher', (req, res) => {
  res.send({key: pusherKey, version: extensionVersion, ggVersion: pusherGGVersion});
});
app.post('/pusher/authproxy', async (req, res) => { //Needed to circumvent CORS
  const response = await fetch(pusherAuthEndpoint, {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': req.header('Authorization')}, body: req.body});
  const json = await response.json();
  res.status(response.status).send(json);
});
app.get('/pusher/history/:session', async (req, res) => { //Also needed to circumvent CORS
  const response = await fetch(`https://snat.goguardian.com/api/v1/ext/chat-messages?sessionId=${req.params.session}`, {headers: {'Authorization': req.header('Auth')}});
  const json = await response.json();
  res.status(response.status).send(json);
});

const makePusherFromComprand = comprand => {
  const options = {
    cluster: 'goguardian',
    authEndpoint: pusherAuthEndpoint,
    auth: {
      headers: {
        'Authorization': comprand
      },
      params: {
        version: extensionVersion,
        liveStateVersion: pusherGGVersion
      }
    }
  };
  pusherClients[comprand] = new Pusher(pusherKey, options);
};

//  ----------  Internal Work  ----------
const updateMonitoring = () => {
  liveClassroomInfo.map(async (comprandEntry) => {
    if (comprandEntry.monitoring) {
      try {
        const res = await fetch('https://inquisition.goguardian.com/v2/ext/livemode', {
          headers: {
            'Authorization': comprandEntry.id
          }
        });

        const responseAsText = await res.text();
        try {
          const data = JSON.parse(responseAsText);  //This can fail so we wrap this in a try-catch
          if (loggingIsVerbose) formatLog(`CompRand ${comprandEntry.id} is in ${data.classroomSessions.length} class${data.classroomSessions.length!=1?'es':''}.`);
          const oldSessions = comprandEntry.sessions.map(e => { return e.id; });
          const newSessions = data.classroomSessions.map(e => { return e.id; });
          newSessions.map((e, index) => { if (!oldSessions.includes(e)) joinClass(data.classroomSessions[index], comprandEntry.id); });
          oldSessions.map((e, index) => { if (!newSessions.includes(e)) leaveClass(comprandEntry.sessions[index], comprandEntry.id); });
          liveClassroomInfo[liveClassroomInfo.indexOf(comprandEntry)].sessions = data.classroomSessions;
        } catch (error) {  //Response isn't valid JSON
          formatLog('Failed to parse class info response: ' + error);
          const responseLogPath = path.join(getTempDir(), uuid.v4() + '.log');
          fs.writeFile(responseLogPath, responseAsText, (fileErr) => {
            if (!fileErr) {
              formatLog(`Unexpected response has been logged to ${responseLogPath} for debugging`);
            } else {
              formatLog('Error writing to log file: ' + fileErr);  //No need to throw here, this isn't important
            }
          });
        }
      } catch (error) {  //Fetch failure (network error)
        formatLog('Failed to fetch class info: ' + error);
      }
    }
  });
};
let monitoringInterval = setInterval(updateMonitoring, oldUpdateInterval);

const joinClass = (classInfo, comprand) => {
  formatLog(`CompRand ${comprand} joined ${classInfo.classroomName}`);
  if (classroomHistory.filter(e => e.id == classInfo.id).length == 0) {  //Prevents duplicate history entries
    const startTime = parseInt(classInfo.startTimeMS) || Date.now();  //Use the new start timestamp from Inquisition
    classroomHistory.unshift({  //Unshift adds to the front of an array
      name: classInfo.classroomName,
      id: classInfo.id,
      classroomId: classInfo.classroomId,
      date: new Date().toDateString(),
      startMs: startTime
    });
    if (notificationsEnabled) {
      notifier.notify({
        title: 'GoGuardian Monitor',
        message: `Connected to "${classInfo.classroomName}"`
      });
    }
  }

  if (classrooms[classInfo.classroomId]) {  //Class exists already, check if any admins were added
    Object.keys(classInfo.admins).map(e => {if (!Object.keys(classrooms[classInfo.classroomId].admins).includes(e)) {
      classrooms[classInfo.classroomId].admins = {...classrooms[classInfo.classroomId].admins, [e]: classInfo.admins[e]};
      if (loggingIsVerbose) formatLog(`New admin for ${classInfo.classroomName}: ${classInfo.admins[e].name}`);
    }});
  } else {
    classrooms[classInfo.classroomId] = {
      name: classInfo.classroomName,
      admins: classInfo.admins, //Teachers are stored here (from inquisition, not Pusher)
      people: []  //Students aid's are stored here
    };
    if (loggingIsVerbose) formatLog(`New classroom (${classInfo.classroomName}) created with ${classInfo.admins.length} admin${classInfo.admins.length!=1?'s':''}`);
  }

  //  ----------  Pusher Presence Stuff  ----------
  let presenceChannel = pusherClients[comprand].subscribe(`presence-session.${classInfo.id}`);
  presenceChannel.bind('pusher:member_added', member => {
    const memberObj = member.info;
    if (loggingIsVerbose) {
      formatLog(`Member connected to ${classInfo.classroomName}:`);
      console.dir(memberObj);
    }
    people[memberObj.aid] = memberObj;
    if (!classrooms[classInfo.classroomId].people.includes(memberObj.aid) && memberObj.type == 'student') {
      classrooms[classInfo.classroomId].people.push(memberObj.aid);
    }
  });
  presenceChannel.bind('pusher:subscription_error', err => {
    formatLog('Pusher subscription failure:');
    console.log(err);
  });
  presenceChannel.bind('pusher:subscription_succeeded', () => {
    if (loggingIsVerbose) formatLog('Pusher connection successful to ' + classInfo.classroomName);
    Object.keys(presenceChannel.members.members).map(member => {
      const memberObj = presenceChannel.members.members[member];
      if (loggingIsVerbose) console.dir(memberObj);
      people[memberObj.aid] = memberObj;
      if (memberObj.type == 'student' && !classrooms[classInfo.classroomId].people.includes(memberObj.aid)) {
        classrooms[classInfo.classroomId].people.push(memberObj.aid);
      }
    });
  });
};
const leaveClass = (classInfo, comprand) => {
  formatLog(`CompRand ${comprand} left ${classInfo.classroomName}`);
  const session = classroomHistory.filter(e => e.id == classInfo.id)[0];
  const classId = classroomHistory.indexOf(session);
  classroomHistory[classId].endMs = Date.now();
  pusherClients[comprand].unsubscribe(`presence-session.${classInfo.id}`);
};

app.listen(port, formatLog(`App started on port ${port}.`));
