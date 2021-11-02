# GoGuardian Monitor

**Monitor gives transparency to software that tracks students.**

![dashboard](https://user-images.githubusercontent.com/37093293/119205564-27a8d400-ba5e-11eb-9a1d-9b9ac6a5fd86.png)

## Features
* **Multi-User Monitoring:** Track activity of up to 5 students at once
* **Chat Service:** View chat messages from any student in saved sessions
* **Classroom Stats:** Access session history, classroom admins, and a list of students in a class
* **Chat Client:** Chat with your teachers from anywhere, even without GoGuardian installed
* **Desktop Notifications:** Get notified when tracked students join a class
* **Data Backups:** Keep your data even if the server isn't running
* **Monitoring by Email:** Track students without needing their ID
* **GoGuardian Account Creation:** Create additional accounts to be used as workers

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
Once there, you will be redirected to a settings page where you can add up to 5 "CompRands".  
For now, 5 is the limit but only 1 is required to get started.  
If you don't have a CompRand yet, go to [Account Creation](#goguardian-account-creation) to learn how to get one.  
Once the server is configured with valid CompRands, a back button will appear on the top-left of the screen. Click it and you will be taken to the dashboard.  
*If you've made it this far, great! All the setup is now complete.*  
**Here are some important things to know about the settings page & "CompRands":**
* A "CompRand" is a unique ID for a student in GoGuardian
* Putting a CompRand in worker mode allows you to change the person it's assigned to
* Assigning an email address to a CompRand can often take several minutes, so watch the server log to know when a change succeeds
* The monitoring interval changes how long the server waits between checking for a user's in-class state
* Backup files can be downloaded by clicking the save icon in the top-right corner of the screen
* If a backup is created while a tracked student is in a class, future restores from that backup will show that the class is still in progress despite that not always being true.
* GoGuardian Teacher has students with the extension join a "presence channel" that lets them know which students are online. Monitor connects to these channels automatically to get the same data as the teachers. Because of this, students being tracked by Monitor will appear online in every class they're in.
* If Monitor tracks a student that is not using the extension, their teacher will see that they are online, but won't get any data from them. If this happens, their teacher will see "Waiting For Activity" on their tile in GoGuardian Teacher. **Source:** [Student's Screen Says "Waiting For Activity"](https://help.goguardian.com/hc/en-us/articles/360047896552-Student-s-Screen-Says-Waiting-For-Activity)

## Advanced
### GoGuardian Account Creation
To track students in Monitor you need their CompRand.  
This usually requires physical access to their computer and experience in the extension, but by using CompRand generation and workers in Monitor, you can avoid this problem entirely.  
**Note:** Before you do this, you need a GoGuardian org id, which is the extension id of the "*GoGuardian License*" chrome extension.  
To find this, go to **chrome://extensions** and click "Details" for *GoGuardian License*. Once you do that, the site URL should change to show the extension id.  
**Ex:** *chrome://extensions?id=__jkfvjkbknkdmejnhsuiiokekjw__*  
With the org id, run the command below replacing "YOUR_ID_HERE" with the org id
```bash
npm run createUser -- "YOUR_ID_HERE"
```
If everything worked, you should see an output like this:
```
Your new account has successfully been created under the school "Example School"
Below is your GoGuardian ID, or compRand:
ffcfa9f2-eff6-4532-826a-780e2dcfef6c

It important that you do not lose it, so saving it in a file is recommended
You can use this ID as a worker in Monitor since it isn't connected to anyone
```
Like the command says, you should save your new CompRand somewhere and use it as a worker in Monitor since it isn't connected to anyone.  
If you are using it as a worker, you can assign an email address of someone in your school to it.

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
