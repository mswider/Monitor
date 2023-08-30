const fetch = require('node-fetch');
const convert = require('xml-js');
const Pusher = require('pusher-js');
const notifier = require('node-notifier');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const uuid = require('uuid');
const fs = require('fs');
const express = require('express');
const app = express();
app.use(express.json());
app.use(express.text({type: 'application/x-www-form-urlencoded'}));
app.use(express.static('build'));
const api = express.Router();
const argv = yargs(hideBin(process.argv))
  .config()
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
let people = {};
let classrooms = {};
let classroomHistory = [];
let studentChats = {};
let extensionVersion = '1.0.0.0';
const pusherKey = '4e83de4fd19694be0821';
const pusherGGVersion = 6;
const pusherAuthEndpoint = 'https://sakura.goguardian.com/api/v1/auth/ext';

class Device {
  id;
  info;
  #getIPAddress;
  inactive = false;
  locked = true;
  #socket;
  #sessions = [];

  static UserIsNotGenuine = '1337'; // A special property which we put in capabilities to identify devices that we're tracking
                                    // This will cause genuine devices to always appear as seperate from us

  constructor(deviceID, { userInfo, version, getIPAddress }) {
    this.id = deviceID;
    this.info = userInfo;
    this.#getIPAddress = getIPAddress;

    const options = {
      cluster: 'goguardian',
      authEndpoint: pusherAuthEndpoint,
      auth: {
        headers: { 'Authorization': deviceID  },
        params: {
          version,
          liveStateVersion: pusherGGVersion,
          capabilities: `1,2,${Device.UserIsNotGenuine}`,  // VariableEntityFlush, AnnotateScreenDot, UserIsNotGenuine (not an actual gg attribute, but one we can use)
          clientType: 'extension',
          os: 'default',        // ChromeOS
          protocolVersion: 1
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
    const IP = this.#getIPAddress(this.info.orgRand);
    const res = await fetch('https://inquisition.goguardian.com/v2/ext/livemode', { headers: { 'Authorization': this.id, ...( IP && { 'X-Forwarded-For': IP } ) } });
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
  async getDevicePolicy() {
    const res = await fetch('https://snat.goguardian.com/api/v1/ext/policy', { headers: { 'Authorization': this.id } });
    if (!res.ok) throw new Error(`Failed to fetch device policy: code ${res.status}`);
    return await res.json();
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

    if (people[member.aid]) {
      const capabilities = member.capabilities?.split(',') || [];
      if (!capabilities.includes(Device.UserIsNotGenuine)) people[member.aid] = { ...member, __monitorVerified: true };
    } else {
      people[member.aid] = member;
    }

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
  static async new(deviceID, version, getIPAddress) {
    const res = await fetch('https://snat.goguardian.com/api/v1/ext/user', { headers: { 'Authorization': deviceID } });
    if (!res.ok) throw new Error(`Failed to fetch user info: code ${res.status}`);
    const userInfo = await res.json();
    return new Device(deviceID, { userInfo, version, getIPAddress });
  }
}

class DeviceManager {
  #devices;
  #interval;

  #intervalMS;
  #version = '1.0.0.0';
  #addressCache;

  static defaultUpdateInterval = 15000;

  constructor() {
    this.#devices = new Map();
    this.#addressCache = new Map();
    this.#interval = setInterval(this.#updateSessions.bind(this), DeviceManager.defaultUpdateInterval);
    this.#intervalMS = DeviceManager.defaultUpdateInterval;
    setInterval(this.#refreshDevices.bind(this), 15 * 60 * 1000);
    setInterval(this.#refreshSettings.bind(this), 30 * 60 * 1000);
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
  async updateVersion() {
    try {
      const version = await DeviceManager.getExtVersion();
      if (version != this.#version) DeviceManager.log(`New extension version: ${version}`);
      this.#version = version;
      extensionVersion = version;
      this.#devices.forEach(device => device.setPusherVersion(version));
    } catch (error) {
      DeviceManager.log(`Failed to update extension version: ${error}`);
    }
  }
  async updateOrgSettings(useCache = false) {
    let addresses = useCache ? this.#addressCache : new Map();
    for (const [id, device] of this.#devices.entries()) {
      const orgID = device.info.orgRand;
      if (!addresses.has(orgID)) {
        try {
          const policy = await device.getDevicePolicy();
          const ranges = policy.orgSettings.IPRanges;
          const address = ranges.length == 0 ? null : ranges[0].start;
          addresses.set(orgID, address);
          if (loggingIsVerbose) DeviceManager.log(`Determined IP address for ${new Buffer.from(device.info.orgName, 'base64').toString('ascii')}: ${address}`);
        } catch (error) {
          if (loggingIsVerbose) DeviceManager.log(`Failed to get device policy for ${id}: ${error}`);
        }
      }
    }
    this.#addressCache = addresses;
  }
  getIPAddress(orgID) {
    return this.#addressCache.has(orgID) ? this.#addressCache.get(orgID) : null;
  }
  #refreshSettings() {
    this.updateVersion();
    this.updateOrgSettings();
  }
  getAllDevices() {
    let list = {};
    this.#devices.forEach(({ info, inactive, locked }, id) => (list[id] = {
      info,
      inactive,
      locked,
      isVerified: !!people[info.accountId]?.__monitorVerified && ( info.subAccountId == people[info.accountId].sid ),
      name: people[info.accountId]?.name || 'Unknown User'
    }));
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
        activeDevices[device.id] = {
          email: info.emailOnFile,
          name: people[info.accountId]?.name,
          sid: info.subAccountId,
          aid: info.accountId,
          isVerified: !!people[info.accountId]?.__monitorVerified && ( info.subAccountId == people[info.accountId].sid )
        };
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
    const device = await Device.new(deviceID, this.#version, this.getIPAddress.bind(this));
    this.#devices.set(deviceID, device);
    await this.updateOrgSettings(true);
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
  static async getExtVersion() {
    const xml = await fetch('https://ext.goguardian.com/stable.xml').then(data => data.text());
    const json = JSON.parse(convert.xml2json(xml, {compact: true}));
    return json.gupdate.app.updatecheck._attributes.version;
  }
}

const manager = new DeviceManager();
manager.updateVersion();

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
deviceApi.get('/sessions/for/:subAccount', (req, res) => {
  if (/^\d+$/.test(req.params.subAccount)) {
    const subAccount = parseInt(req.params.subAccount);
    const result = Object.entries(manager.getAllDevices()).find(([_, { info }]) => info.subAccountId == subAccount);
    if (result) {
      const [id, device] = result;
      const { sessions: allSessions } = manager.getSessions();
      const sessions = Object.fromEntries(Object.values(allSessions).filter(({ devices }) => devices.includes(id)).map(e => [e.info.id, e.info]));
      res.json({
        sessions, id, name: device.name, aid: device.info.accountId, sid: device.info.subAccountId, isVerified: device.isVerified
      });
    } else {
      res.status(404).send('subAccount not found');
    }
  } else {
    res.status(400).send('subAccount must be an int');
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

const chatAPI = express.Router();

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

api.get('/backup', (req, res) => {
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
api.get('/classrooms', (req, res) => {
  res.send(classrooms);
});
api.get('/classrooms/:classroom', (req, res) => {
  if (classrooms.hasOwnProperty(req.params.classroom)) {
    const classroom = classrooms[req.params.classroom];
    const students = Object.fromEntries(classroom.people.map(person => ([person, people[person]])));
    const teachers = Object.fromEntries(Object.keys(classroom.admins).map(aid => ([aid, people[aid]])).filter(([_, e]) => e));
    const data = {
      ...classroom,
      people: req.query.withAdmins ? { ...students, ...teachers } : students
    };
    res.json(data);
  } else {
    res.sendStatus(404);
  }
});
api.get('/classhistory', (req, res) => {
  res.send(classroomHistory);
});
api.get('/people/:accountAID', (req, res) => {
  const person = people[req.params.accountAID];
  person ? res.send(person) : res.sendStatus(404);
});
api.get('/people', (req, res) => {
  res.send(people);
});

//  ----------  Pusher Chat Internals  ----------
const pusherAPI = express.Router();
pusherAPI.get('/config', (req, res) => {
  res.send({ key: pusherKey, version: extensionVersion, ggVersion: pusherGGVersion, magicNumber: Device.UserIsNotGenuine });
});
pusherAPI.post('/auth', asyncHandler(async (req, res) => { //Needed to circumvent CORS
  const response = await fetch(pusherAuthEndpoint, {method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': req.header('Authorization')}, body: req.body});
  const json = await response.json();
  res.status(response.status).send(json);
}));
pusherAPI.get('/history/:session', asyncHandler(async (req, res) => { //Also needed to circumvent CORS
  const response = await fetch(`https://snat.goguardian.com/api/v1/ext/chat-messages?sessionId=${req.params.session}`, {headers: {'Authorization': req.header('Auth')}});
  const json = await response.json();
  res.status(response.status).send(json);
}));

api.use('/devices', deviceApi);
api.use('/tasks', tasksAPI);
api.use('/chat', chatAPI);
api.use('/pusher', pusherAPI);
app.use('/api', api);
app.listen(port, formatLog(`App started on port ${port}.`));
