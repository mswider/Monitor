# GoGuardian Monitor

**Monitor gives transparency to software that tracks students.**

![dashboard](https://user-images.githubusercontent.com/37093293/204198473-dd188c48-c5d8-4d5a-a2b2-760679065b6d.png#gh-light-mode-only)
![dashboard](https://user-images.githubusercontent.com/37093293/204198759-bcd6765b-d282-4155-8e07-6b0e1189f6d0.png#gh-dark-mode-only)
![chat](https://github.com/mswider/Monitor/assets/37093293/50e34415-3bce-4fe5-88d3-a1dbe49c1241#gh-light-mode-only)
![chat](https://github.com/mswider/Monitor/assets/37093293/7a3367e5-3789-439f-96aa-5b4fc39fbfd3#gh-dark-mode-only)



## Features
* **Multi-User Monitoring:** Track activity of several students at once
* **Chat Service:** View chat messages from any student in saved sessions
* **Classroom Stats:** Access session history, classroom admins, and a list of students in a class
* **Dark Mode**
* **Chat Client:** Chat with your teachers from anywhere, even without GoGuardian installed
* **Desktop Notifications:** Get notified when tracked students join a class
* **Data Backups:** Keep your data even if the server isn't running
* **Account Creation:** Create additional accounts to track

## Requirements
* **[Node.js](https://nodejs.org)**: Runs the code  
* **[npm](https://npmjs.com)**: Installs the packages  

## Usage
### Setup
To install the dependencies, run the command below:
```bash
npm install
```
Next, build the frontend code with this command:
```bash
npm run build
```
Finally, you might also want to make a folder to keep backups in.

### Running
To start the server without any parameters, run the command below:
```bash
npm start
```
To use parameters, add "**--**" after "npm start" like the example below:
```bash
npm start -- --backup /path/to/backup.json --notify
```
Here's a list of parameters available:
```
-p, --port     Configures the port used for the web server     [default: 3000]
-b, --backup   Sets file used to restore from backup
-v, --verbose  Sets the logging level to verbose    [boolean] [default: false]
-n, --notify   Enables desktop notifications        [boolean] [default: false]
```
**Note:** Elevated permissions are typically required by your OS to run on ports lower than 1024

### Configuration
Once you've started the server, open its web page in your browser.  
By default, this will be at [localhost:3000](http://localhost:3000/) for your own computer.  
You'll be redirected to settings, where you can add or create accounts of students in your school to get started.

**Important things to know about the settings page & accounts:**
* Backup files can be downloaded by clicking the save icon in the top-right corner of the screen
* If a backup is created while a tracked student is in a class, future restores from that backup will show that the class is still in progress despite that not always being true.
* Monitor automatically connects to class sessions, so students being tracked by Monitor will appear online in every class they're in.
* If Monitor tracks a student that is not using the extension, their teacher will see that they are online, but won't get any data from them. If this happens, their teacher will see "Waiting For Activity" on their tile in GoGuardian Teacher. **Source:** [Student's Screen Says "Waiting For Activity"](https://support.goguardian.com/s/article/Students-Screen-Says-Waiting-For-Activity-1630104942037)

## Advanced
### GoGuardian Account Creation
Want to track a student but don't know their device ID? No problem!  
Go to add an account in settings and click "Create Virtual Device" to create an account to track them.  

**Note:** Before you do this, you need a GoGuardian license ID, which is the extension ID of the "*GoGuardian License*" chrome extension.  
To find this, go to **chrome://extensions** and click "Details" for *GoGuardian License*. Once you do that, the URL should change to show the extension ID.  
**Ex:** *chrome://extensions?id=__bofhfaclfglmfciiogikgndbdejhjjcc__*

After you get the school's license ID, you'll need the student's email address and full name.
You should get this information from Gmail. Be sure to copy and paste info so you get it correct.  
If you get something wrong, it could change the student's name in GoGuardian's systems, so be careful.

### Development
**Note:** *Snowpack* is used for builds, *Express* is used for the web server, and *React* is used with *Material UI* for the frontend.  
If you're changing files while the server is running, you'll want to use Snowpack in watch mode, which builds files when you save changes to them.  
To run Snowpack in watch mode, run the command below:
```bash
npm run buildWatch
```
Watch mode is great for development, but once you've made your changes you'll probably want the build to be minified.  
To get a final minified build, run the command below:
```bash
npm run build
```
*It's important to remember that watch mode doesn't minify files and if you use watch mode after a normal build, the optimizations will be lost.*
