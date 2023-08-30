## Development
> [Snowpack](https://www.snowpack.dev/) is used for builds, [Express](https://expressjs.com/) is used for the web server, and [React](https://react.dev/) is used with [Material UI](https://mui.com/) for the frontend.  

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
It's important to remember that watch mode doesn't minify files and if you use watch mode after a normal build, the optimizations will be lost.