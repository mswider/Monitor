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
const api = express.Router();
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

class Device {
  id;
  info;
  inactive = false;
  locked = true;
  #socket;
  #sessions = [];

  constructor(deviceID, { userInfo } = {}) {
    this.id = deviceID;
    this.info = userInfo;

    const options = {
      cluster: 'goguardian',
      authEndpoint: pusherAuthEndpoint,
      auth: {
        headers: { 'Authorization': deviceID  },
        params: {
          version: extensionVersion,
          liveStateVersion: pusherGGVersion
        }
      }
    };
    this.#socket = new Pusher(pusherKey, options);
    Device.log(`new Device with id ${deviceID}`);
  }

  static log(message) {
    formatLog(`[DEVICE]: ${message}`);
  }

  //  ----------  Device API  ----------
  async updateSessions() {
    if (this.inactive) throw new Error('Device is no longer active');
    const res = await fetch('https://inquisition.goguardian.com/v2/ext/livemode', { headers: { 'Authorization': this.id } });
    if (!res.ok) throw new Error(`Failed to fetch active sessions: code ${res.status}`);
    const oldSessions = this.#sessions;
    this.#sessions = await res.json().then(e => e.classroomSessions);
    this.#sessions.map(e => oldSessions.map(s => s.id).includes(e.id) || this.#join(e));
    oldSessions.map(e => this.#sessions.map(s => s.id).includes(e.id) || this.#leave(e));
    return this.getSessions();
  }
  getSessions() {
    return this.#sessions;
  }
  async updateUserInfo() {
    const res = await fetch('https://snat.goguardian.com/api/v1/ext/user', { headers: { 'Authorization': this.id } });
    if (!res.ok) throw new Error(`Failed to fetch user info: code ${res.status}`);
    const oldEmail = this.info.emailOnFile;
    this.info = await res.json();
    if (this.info.emailOnFile != oldEmail) {
      Device.log(`Detected email change for ${this.id}: ${oldEmail || '(no assignment)'} => ${this.info.emailOnFile || '(no assignment)'}`);
    }
    return this.info;
  }
  async getChats(session) {
    if (this.inactive) throw new Error('Device is no longer active');
    const res = await fetch(`https://snat.goguardian.com/api/v1/ext/chat-messages?sessionId=${session}`, { headers: { 'Authorization': this.id } });
    if (!res.ok) throw new Error(`Failed to fetch chats for ${session}: code ${res.status}`);
    return await res.json().then(e => e.messages);
  }

  //  ----------  Pusher Integration  ----------
  setPusherVersion(version) {
    this.#socket.config.auth.params.version = version;
  }
  #saveMember(member, classInfo) {
    if (loggingIsVerbose) Device.log(`${member.name} connected to ${classInfo.classroomName}`);
    people[member.aid] = member;
    if (!classrooms[classInfo.classroomId].people.includes(member.aid) && member.type == 'student') {
      classrooms[classInfo.classroomId].people.push(member.aid);
    }
  }
  #join(classInfo) {
    Device.log(`${this.id} joined ${classInfo.classroomName}`);
    if (loggingIsVerbose) console.log(classInfo);
    if (!classroomHistory.find(e => e.id == classInfo.id)) {
      const startTime = parseInt(classInfo.startTimeMS) || Date.now();
      classroomHistory.unshift({
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
  
    if (classrooms[classInfo.classroomId]) {
      Object.keys(classInfo.admins).map(e => {if (!classrooms[classInfo.classroomId].admins[e]) {
        classrooms[classInfo.classroomId].admins = {...classrooms[classInfo.classroomId].admins, [e]: classInfo.admins[e]};
        Device.log(`New admin for ${classInfo.classroomName}: ${classInfo.admins[e].name}`);
      }});
    } else {
      classrooms[classInfo.classroomId] = {
        name: classInfo.classroomName,
        admins: classInfo.admins,
        people: []
      };
      const admins = Object.keys(classInfo.admins).length;
      Device.log(`New classroom (${classInfo.classroomName}) created with ${admins} admin${admins != 1 ? 's' : ''}`);
    }

    let presenceChannel = this.#socket.subscribe(`presence-session.${classInfo.id}`);
    presenceChannel.bind('pusher:member_added', e => this.#saveMember(e.info, classInfo));
    presenceChannel.bind('pusher:subscription_error', err => {
      Device.log(`Pusher subscription failure for ${this.id} in connection to presence-session.${classInfo.id}:`), console.log(err);
    });
    presenceChannel.bind('pusher:subscription_succeeded', () => {
      if (loggingIsVerbose) Device.log(`Pusher connection successful to ${classInfo.classroomName}`);
      Object.values(presenceChannel.members.members).map(e => this.#saveMember(e, classInfo));
    });
  }
  #leave(session) {
    Device.log(`${this.id} left ${session.classroomName}`);
    if (loggingIsVerbose) console.log(session);
    const sessionIndex = classroomHistory.findIndex(e => e.id == session.id);
    classroomHistory[sessionIndex].endMs = Date.now();
    this.#socket.unsubscribe(`presence-session.${session.id}`);
  };

  //  ----------  Device Management  ----------
  destroy() {
    if (this.inactive) return Device.log('already removed');
    this.#socket.channels.all().map(({name}) => this.#socket.unsubscribe(name));  // Used instead of disconnect() bc we might have to reuse the socket
    if (loggingIsVerbose) Device.log('disconnected from channels');
    this.inactive = true;
  }
  async assign(name, email) {
    if (this.locked) throw new Error('Device is locked');
    if (this.inactive) throw new Error('Device is no longer active');
    this.destroy();
    Device.log(`attempting to assign ${this.id} to ${name} (${email})`);

    let urlencoded = new URLSearchParams();
    const props = { email, name, googleProfileId: 0, url: 'chrome.identity' };
    Object.entries(props).map(e => urlencoded.append(...e));
    const options = {
      method: 'POST',
      headers: { 'authorization': this.id, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: urlencoded.toString()
    };
    const res = await fetch('https://extapi.goguardian.com/api/v1/ext/nameandemail', options);
    if (loggingIsVerbose) Device.log('assignment response:'), console.log(await res.json(), res.status);
    if (!res.ok) throw new Error(`Assignment failed, HTTP error: ${res.status}`);

    while (true) {
      await new Promise(e => setTimeout(e, 2500));
      try {
        if (await this.updateUserInfo().then(e => e.emailOnFile) == email) break;
      } catch (error) {
        Device.log(`Email check failed: ${error}`);
      }
    }

    this.inactive = false;
    this.#sessions = [];
    Device.log(`assignment succeeded for ${this.id}`);
  }

  static async register(orgID) {
    Device.log('registering new device...');
    let urlencoded = new URLSearchParams();
    urlencoded.append('orgRands[]', orgID);
    const options = {
      method: 'POST',
      headers: { 'Authorization': '', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: urlencoded.toString()
    };
    const res = await fetch('https://extapi.goguardian.com/api/v1/ext/register', options);
    if (!res.ok) throw new Error(`Failed to register new device: code ${res.status}`);
    const data = await res.json();
    Device.log(`obtained new device id: ${data.compRandUuid} (member of ${new Buffer.from(data.orgName, 'base64').toString('ascii')})`);
    return data.compRandUuid;
  }
  static async new(deviceID) {
    const res = await fetch('https://snat.goguardian.com/api/v1/ext/user', { headers: { 'Authorization': deviceID } });
    if (!res.ok) throw new Error(`Failed to fetch user info: code ${res.status}`);
    const userInfo = await res.json();
    return new Device(deviceID, { userInfo });
  }
}

class DeviceManager {
  #devices;
  #interval;

  #intervalMS;

  static defaultUpdateInterval = 15000;

  constructor() {
    this.#devices = new Map();
    this.#interval = setInterval(this.#updateSessions.bind(this), DeviceManager.defaultUpdateInterval);
    this.#intervalMS = DeviceManager.defaultUpdateInterval;
    setInterval(this.#refreshDevices.bind(this), 15 * 60 * 1000);
  }

  static log(message) {
    formatLog(`[MANAGER]: ${message}`);
  }

  #refreshDevices() {
    this.#devices.forEach(device => {
      device.updateUserInfo().catch(error => loggingIsVerbose && DeviceManager.log(`Failed to refresh device: ${error}`));
    });
  }
  #updateSessions() {
    this.#devices.forEach(device => {
      device.updateSessions().catch(error => loggingIsVerbose && DeviceManager.log(`Failed to update a user's sessions: ${error}`));
    });
  }
  #endSessionIfNoUsers(deviceID, session) {
    let sessions = new Set();
    this.#devices.forEach(device => device.id != deviceID && device.getSessions().map(e => sessions.add(e.id)));
    if (!sessions.has(session.id)) {
      const sessionIndex = classroomHistory.findIndex(e => e.id == session.id);
      classroomHistory[sessionIndex].endMs = Date.now();
    }
  }
  changeUpdateInterval(newIntervalMS) {
    if (newIntervalMS == this.#intervalMS) return;
    clearInterval(this.#interval);
    this.#interval = setInterval(this.#updateSessions.bind(this), newIntervalMS);
    this.#intervalMS = newIntervalMS;
    DeviceManager.log(`Updated monitoring interval to ${newIntervalMS / 1000} second${newIntervalMS != 1000 ? 's' : ''}`);
  }
  getUpdateInterval() {
    return this.#intervalMS;
  }
  updateVersion(version) {
    this.#devices.forEach(device => device.setPusherVersion(version));
  }
  getAllDevices() {
    let list = {};
    this.#devices.forEach(({ info, inactive, locked }, id) => (list[id] = { info, inactive, locked }));
    return list;
  }
  setLocked(deviceID, isLocked) {
    if (!this.#devices.has(deviceID)) throw new Error(`Not currently monitoring device with id ${deviceID}`);
    const device = this.#devices.get(deviceID);
    const oldLocked = device.locked;
    device.locked = isLocked;
    if (isLocked != oldLocked) DeviceManager.log(`${deviceID} has been ${isLocked ? 'locked' : 'unlocked'}`);
  }
  getSessions() {
    let sessions = {};  // [id]: {info, devices}
    let activeDevices = {};
    this.#devices.forEach(device => {
      device.getSessions().map(session => {
        if (sessions[session.id]) {
          sessions[session.id].devices.push(device.id);
        } else {
          sessions[session.id] = { info: session, devices: [ device.id ] };
        }
        const { info } = device;
        activeDevices[device.id] = { email: info.emailOnFile, name: people[info.accountId]?.name, sid: info.subAccountId };
      });
    });
    return { sessions, devices: activeDevices };
  }
  async getChatsForSessions(deviceID, sessions) {
    if (!this.#devices.has(deviceID)) throw new Error(`Not currently monitoring device with id ${deviceID}`);
    const device = this.#devices.get(deviceID);
    const aid = device.info.accountId;
    const retryDelay = 5000;
    const iterationCap = 10;
    let recordedSessions = [];
    let iterations = 0;
    while (recordedSessions.length != sessions.length) {
      if (iterations >= iterationCap) throw new Error('Iteration cap exceeded');
      if (iterations != 0) {
        DeviceManager.log('Failed to grab some sessions, retrying after delay');
        await new Promise(e => setTimeout(e, retryDelay));
      }
      const sessionsToRecord = sessions.filter(session => !recordedSessions.includes(session));
      if (loggingIsVerbose) DeviceManager.log(`Sessions to record: ${sessionsToRecord} ; Already recorded: ${recordedSessions}`);
      const promises = sessionsToRecord.map(session => {
        return device.getChats(session).then(messages => {
          if (!studentChats[aid]) studentChats[aid] = {};
          studentChats[aid][session] = messages;
          if (loggingIsVerbose) console.log(messages);
          recordedSessions.push(session);
        });
      });
      await Promise.allSettled(promises);
      iterations++;
    }
  }
  async add(deviceID) {
    if (this.#devices.has(deviceID)) throw new Error(`Already added device with id ${deviceID}`);
    const device = await Device.new(deviceID);
    this.#devices.set(deviceID, device);
    if (loggingIsVerbose) DeviceManager.log(device.info.emailOnFile ? `Added new device belonging to ${device.info.emailOnFile}` : 'Added new device with no association');
    DeviceManager.log(`Monitoring ${this.#devices.size} device${this.#devices.size != 1 ? 's' : ''}`);
  }
  async register(orgID) {
    const deviceID = await Device.register(orgID);
    await new Promise(e => setTimeout(e, 2000));  // One time I got a 403 right after registration so their db is wack ig
    await this.add(deviceID);
    return deviceID;
  }
  async assign(deviceID, name, email) {
    if (!this.#devices.has(deviceID)) throw new Error(`Not currently monitoring device with id ${deviceID}`);
    const device = this.#devices.get(deviceID);
    if (device.inactive) throw new Error('Device is no longer active'); // Prevents the device from being removed if this is called while the device is awaiting assignment
    device.getSessions().map(session => this.#endSessionIfNoUsers(device.id, session));
    try {
      await device.assign(name, email);
    } catch (error) {
      DeviceManager.log('Failed to assign device, removing due to broken state...');
      this.remove(deviceID);
      throw new Error(`Failed to assign device: ${error}`);
    }
  }
  remove(deviceID) {
    if (!this.#devices.has(deviceID)) throw new Error(`Not currently monitoring device with id ${deviceID}`);
    const device = this.#devices.get(deviceID);
    device.getSessions().map(session => this.#endSessionIfNoUsers(device.id, session));
    device.destroy();
    this.#devices.delete(deviceID);
    DeviceManager.log(`Removed device with id ${deviceID}`);
    DeviceManager.log(`Monitoring ${this.#devices.size} device${this.#devices.size != 1 ? 's' : ''}`);
  }
}

const manager = new DeviceManager();

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
function formatLog (text) {
  console.log(`${new Date().toLocaleString()} - ${text}`);
}
function validate(obj, validators) {
  let invalid = [];
  Object.entries(validators).forEach(([key, validator]) => (validator(obj[key]) || invalid.push(key)));
  return invalid.length > 0 ? [false, `Invalid properties: ${invalid}`] : [true, ''];
}

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
  try {
    extensionVersion = await getExtVersion();
    manager.updateVersion(extensionVersion);
  } catch (e) {
    formatLog(`Failed to configure Pusher extension version, using default (will be incorrect), ${e}`);
  }
  formatLog('Pusher configured with extension version ' + extensionVersion);
})();
setInterval(() => {
  getExtVersion().then(version => {
    if (version != extensionVersion) formatLog('Pusher reconfigured with new extension version, ' + version);
    extensionVersion = version;
    Object.keys(pusherClients).map(e => {
      pusherClients[e].config.auth.params.version = version;
    });
    manager.updateVersion(version);
  }).catch(e => formatLog(`Failed to update extension version: ${e}`));
}, ((30) * 60 * 1000));

const changeComprandAccount = async (comprand, email, name) => {
  if (loggingIsVerbose) formatLog(`Permission change for ${comprand}, ${name} (${email})`);
  let urlencoded = new URLSearchParams();
  urlencoded.append('email', email);
  urlencoded.append('name', name);
  urlencoded.append('googleProfileId', 0);
  urlencoded.append('url', 'chrome.identity');
  const options = {
    method: 'POST',
    headers: {
      'authorization': comprand,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: urlencoded.toString()
  };
  await fetch('https://extapi.goguardian.com/api/v1/ext/nameandemail', options).then(async res => {
    if (loggingIsVerbose) console.log(await res.json(), res.status);
    if (!res.ok) {
      throw new Error(`Couldn't reassign CompRand, HTTP error: ${res.status}`);
    }
  });

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
api.get('/needsConfig', (req, res) => {
  res.send(needsConfig);
});

//  ----------  Device API  ----------
const deviceApi = express.Router();
const tasks = {};  // [id]: {completed, success, result}

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const checkID = (req, res, next) => req.header('device') ? next() : res.status(400).send('No device ID given');

deviceApi.get('/list', (req, res) => {
  res.json(manager.getAllDevices());
});
deviceApi.post('/locked', checkID, (req, res) => {
  const validators = { locked: e => typeof e == 'boolean' };
  const [valid, errMsg] = validate(req.body, validators);
  if (valid) {
    manager.setLocked(req.header('device'), req.body.locked);
    res.sendStatus(200);
  } else {
    res.status(400).send(errMsg);
  }
});
deviceApi.get('/sessions', (req, res) => {
  res.json(manager.getSessions());
});
deviceApi.get('/interval', (req, res) => {
  res.json({ interval: manager.getUpdateInterval() / 1000 });
});
deviceApi.post('/interval', (req, res) => {
  const validators = { interval: e => typeof e == 'number' && e >= 1 };
  const [valid, errMsg] = validate(req.body, validators);
  if (valid) {
    manager.changeUpdateInterval(req.body.interval * 1000);
    res.sendStatus(200);
  } else {
    res.status(400).send(errMsg);
  }
});
deviceApi.post('/add', checkID, asyncHandler(async (req, res) => {
  await manager.add(req.header('device'));
  needsConfig = false;
  res.sendStatus(200);
}));
deviceApi.post('/new', asyncHandler(async (req, res) => {
  const validators = {
    name: e => typeof e == 'string' && e != '',
    email: e => typeof e == 'string' && e != '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e),
    orgID: e => typeof e == 'string' && e != ''
  };
  const [valid, errMsg] = validate(req.body, validators);
  if (valid) {
    const taskID = uuid.v4();
    tasks[taskID] = { completed: false, success: null, result: null };
    res.status(202).json({ taskID });
    try {
      const deviceID = await manager.register(req.body.orgID);
      manager.setLocked(deviceID, false);
      await manager.assign(deviceID, req.body.name, req.body.email);
      manager.setLocked(deviceID, true);
      needsConfig = false;
      tasks[taskID] = { completed: true, success: true, result: deviceID };
    } catch (error) {
      tasks[taskID] = { completed: true, success: false, result: null };
      throw error;
    }
  } else {
    res.status(400).send(errMsg);
  }
}));
deviceApi.post('/remove', checkID, (req, res) => {
  manager.remove(req.header('device'));
  res.sendStatus(200);
});
deviceApi.post('/assign', checkID, asyncHandler(async (req, res) => {
  const validators = {
    name: e => typeof e == 'string' && e != '',
    email: e => typeof e == 'string' && e != '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
  };
  const [valid, errMsg] = validate(req.body, validators);
  if (valid) {
    const taskID = uuid.v4();
    tasks[taskID] = { completed: false, success: null, result: null };
    res.status(202).json({ taskID });
    try {
      await manager.assign(req.header('device'), req.body.name, req.body.email);
      tasks[taskID] = { completed: true, success: true, result: null };
    } catch (error) {
      tasks[taskID] = { completed: true, success: false, result: null };
      throw error;
    }
  } else {
    res.status(400).send(errMsg);
  }
}));

//  ----------  Tasks API  ----------
const tasksAPI = express.Router();

tasksAPI.get('/all', (req, res) => {
  res.json(tasks);
});
tasksAPI.get('/active', (req, res) => {
  res.json(Object.fromEntries(Object.entries(tasks).filter(([k, v]) => !v.completed).map(([k, { completed, ...rest }]) => [k, rest])));
});
tasksAPI.get('/completed', (req, res) => {
  res.json(Object.fromEntries(Object.entries(tasks).filter(([k, v]) => v.completed).map(([k, { completed, ...rest }]) => [k, rest])));
});
tasksAPI.get('/:id', (req, res) => {
  tasks[req.params.id] ? res.json(tasks[req.params.id]) : res.sendStatus(404);
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
  Object.keys(req.body.data).map(async comprand => {
    const workerIndex = workerInfo.indexOf( workerInfo.filter(e => e.id == comprand)[0] );
    const emailValid = req.body.data[comprand].email != '' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.body.data[comprand].email); //The billion dollar company doesn't validate emails so we do it ourselves
    const isBusy = emailValid && req.body.data[comprand].name != '';
    const classIndex = liveClassroomInfo.indexOf( liveClassroomInfo.filter(e => e.id == comprand)[0] );
    if (isBusy) {
      if (workerInfo[workerIndex].data.email != req.body.data[comprand].email || workerInfo[workerIndex].data.name != req.body.data[comprand].name) {  //Email changed
        let success = true;
        formatLog(`Worker CompRand ${comprand} has been assigned to email ${req.body.data[comprand].email}, requesting change...`);
        await changeComprandAccount(comprand, req.body.data[comprand].email, req.body.data[comprand].name).then(() => {
          formatLog(`Worker CompRand ${comprand} has been changed to email ${req.body.data[comprand].email} successfully`);
        }).catch(e => {
          formatLog(`Assignment of worker Comprand ${comprand} failed: ${e}`);
          success = false;
        });
        if (!success) return null;  //Assignment failed, don't save data
      }
      workerInfo[workerIndex].data.email = req.body.data[comprand].email;
      workerInfo[workerIndex].data.name = req.body.data[comprand].name;
      liveClassroomInfo[classIndex].monitoring = true;
    } else {
      workerInfo[workerIndex].data = {};
      liveClassroomInfo[classIndex].monitoring = false;
      liveClassroomInfo[classIndex].sessions = [];
    }
    workerInfo[workerIndex].busy = isBusy;
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
        if (loggingIsVerbose) console.log(data.messages);
        recordedSessions.push(session);
      });
    });
    await Promise.allSettled(promises);
    iterations++;
  }
};

const chatAPI = express.Router();

// Query params: comprand, aid
chatAPI.get('/updateStudent', async (req, res) => {
  const comprandIsValid = req.query.comprand && comprandArray.map(e => e.id).includes(req.query.comprand);
  const aidIsValid = people[req.query.aid] && people[req.query.aid].type == 'student';
  if (comprandIsValid && aidIsValid) {
    res.sendStatus(202);
    const classesWithStudent = Object.keys(classrooms).filter(e => classrooms[e].people.includes(parseInt(req.query.aid)));
    const sessionsWithStudent = classroomHistory.filter(e => classesWithStudent.includes(e.classroomId.toString())).filter(e => e.endMs).map(e => e.id);
    const sessionsToRecord = getChatStatusByAid(req.query.aid, sessionsWithStudent)[1];  //Only record sessions we don't have yet
    formatLog(`Updating chats for ${people[req.query.aid].name}, ${sessionsToRecord.length} session${sessionsToRecord.length != 1 ? 's' : ''} will be recorded`);
    try {
      const userInfo = await fetch('https://snat.goguardian.com/api/v1/ext/user', { headers: { 'Authorization': req.query.comprand } }).then(data => data.json());
      if (userInfo.accountId != req.query.aid) {
        if (loggingIsVerbose) formatLog(`Need to update email for comprand to ${people[req.query.aid].email}`);
        await changeComprandAccount(req.query.comprand, people[req.query.aid].email, people[req.query.aid].name);
        if (loggingIsVerbose) formatLog(`Email successfully updated to ${people[req.query.aid].email}`);
      }
      await updateChatsByComprand(req.query.comprand, parseInt(req.query.aid), sessionsToRecord);
      formatLog(`Finished chat update for ${people[req.query.aid].name}`);
    } catch (e) {
      formatLog(`Failed to update chats for ${people[req.query.aid].name}, ${e}`);
    }
  } else {
    res.status(400).send({comprandIsValid, aidIsValid});
  }
});
chatAPI.post('/update', checkID, asyncHandler(async (req, res) => {
  const validators = { aid: e => people[e] && people[e].type == 'student' };
  const [valid, errMsg] = validate(req.body, validators);
  if (valid) {
    const taskID = uuid.v4();
    tasks[taskID] = { completed: false, success: null, result: null };
    res.status(202).json({ taskID });
    try {
      const classesWithStudent = Object.keys(classrooms).filter(e => classrooms[e].people.includes(req.body.aid));
      const sessionsWithStudent = classroomHistory.filter(e => classesWithStudent.includes(e.classroomId.toString())).filter(e => e.endMs).map(e => e.id);
      const [_, sessionsToRecord] = getChatStatusByAid(req.body.aid, sessionsWithStudent);
      formatLog(`Updating chats for ${people[req.body.aid].name}, ${sessionsToRecord.length} session${sessionsToRecord.length != 1 ? 's' : ''} will be recorded`);
      const currentAID = manager.getAllDevices()[req.header('device')].info.accountId;
      if (currentAID != req.body.aid) {
        if (loggingIsVerbose) formatLog(`Need to assign device to ${people[req.body.aid].email}`);
        await manager.assign(req.header('device'), people[req.body.aid].name, people[req.body.aid].email);
      }
      await manager.getChatsForSessions(req.header('device'), sessionsToRecord);
      formatLog(`Finished chat update for ${people[req.body.aid].name}`);
      tasks[taskID] = { completed: true, success: true, result: null };
    } catch (error) {
      tasks[taskID] = { completed: true, success: false, result: null };
      throw error;
    }
  } else {
    res.status(400).send(errMsg);
  }
}));
chatAPI.get('/messages/:accountAID', (req, res) => {
  const chats = studentChats[req.params.accountAID];
  const studentExists = people[req.params.accountAID] != undefined;
  chats ? res.send(chats) : ( studentExists ? res.send({}) : res.sendStatus(400) );
});
chatAPI.get('/messages', (req, res) => {
  res.send(studentChats);
});
chatAPI.get('/classroomStatus/:classId', (req, res) => {
  if (classrooms[req.params.classId]) {
    const sessionsForClass = classroomHistory.filter(e => e.classroomId == req.params.classId).filter(e => e.endMs).map(e => e.id);
    let studentStatus = {};
    classrooms[req.params.classId].people.map(studentAID => {
      studentStatus[studentAID] = getChatStatusByAid(studentAID, sessionsForClass)[0];
    });
    res.send(studentStatus);
  } else {
    res.sendStatus(400);
  }
});
chatAPI.get('/studentStatus/:studentAID', (req, res) => {
  if (people[req.params.studentAID]) {
    const classesWithStudent = Object.keys(classrooms).filter(e => classrooms[e].people.includes(parseInt(req.params.studentAID)));
    const sessionsWithStudent = classroomHistory.filter(e => classesWithStudent.includes(e.classroomId.toString())).filter(e => e.endMs).map(e => e.id);
    const status = getChatStatusByAid(req.params.studentAID, sessionsWithStudent);
    res.send({code: status[0], sessionsNeeded: status[1].length});
  } else {
    res.sendStatus(400);
  }
});

app.get('/api/backup', (req, res) => {
  res.set({
    'Content-Disposition': 'attachment; filename=gg_backup.json'
  });
  res.send({
    classrooms,
    people,
    classHistory: classroomHistory,
    chatData: studentChats
  });
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

api.use('/devices', deviceApi);
api.use('/tasks', tasksAPI);
api.use('/chat', chatAPI);
app.use('/api', api);
app.listen(port, formatLog(`App started on port ${port}.`));
