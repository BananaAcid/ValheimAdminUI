# Valheim Admin UI

**Valheim Game Server Admin Web UI - VAUI**

*for Windows. Linux/OSX in the future.*

<img height="200" alt="Mobile - Login" src="https://user-images.githubusercontent.com/1894723/116934508-5c96e780-ac65-11eb-805d-9d8c2d19b08a.png"><img height="200" alt="Mobile - Commands" src="https://user-images.githubusercontent.com/1894723/116934550-66b8e600-ac65-11eb-9a3d-0dcee4d95c54.png"><img height="200" alt="Desktop - Commands" src="https://user-images.githubusercontent.com/1894723/116934525-615b9b80-ac65-11eb-8f9d-3dc1724bd3b0.png">


## Pull requests

> "Bugs ... fixes are really wanted"

Any bugs about this project, feel free to report them at the [issues](https://github.com/BananaAcid/ValheimAdminUI/issues) tab.
And you are welcome to submit pull requests.

## Modes for the Admin UI

- Standalone, just run by NodeJS (and a service)
- IIS Server, using iisnode

## Installation

As standalone installation
1. download the files from github to a new `C:\Server-Games\ValheimAdminUI` folder
	- and open a terminal there
	- install the UI main dependencies: `npm i`
2. install all requirements
	- best to download NSSM and SteamCMD to a folder, e.g. `C:\Server-Games\ValheimAdminUI\tools`
3. configure, see `Paths and commands`  (and that bin folder)
4. add a user to be able to login, see `to create a password hash and save with a user`
5. Install game and service, see `Install the game or service`
6. (setup port forwarding / DynamicDNS)
7. run it with `npm start`
8. open the browser, http://localhost:3000/

## Notes

Using DynamicDNS and IIS you may not want to use HTTPS.
- You would remove the `<rule name="Redirect to https"...` directive.


## Config

Passwords: `app/config.passwords.json`

Paths and commands: `app/config.win32.js` and others.

UI translation: `public/index.html` and `public/commands.html`


## Commands

### special environment variables
- `PORT` - the Valheim Admin UI port to use (defaults to `3000`)
- `PASSWORDFILE` - the full file path to a different password `"*.json"` file
- `CONFIGFILE` - the full file path to a different `"config.*.js"` file

Set a env var on commandline, then run the UI (PORT used as an example):
- Win (cmd): ` \> set PORT=3000 && npm start`
- Win (PS):  `PS> $env:PORT=3000 ; npm start`
- MacOS/LX:  `$ PORT=3000 npm start`

### Start server with a specific port

```
to use a specific port for the web ui:
   npm start -- port 3000
   LINUX:  PORT=3000 npm start
```

### Add users / password

``` 
to create a password hash:
   npm start -- enc  newpassword
   npm test  newpassword
to create a password hash and save with a user:
   npm start -- enc  newpassword user.name
   npm test  newpassword user.name
delete a user:
   npm start -- enc  NULL user.name
   npm test  NULL user.name
```

### Install the game or service (to start/stop or keep the game running)

```
install the "service" or "game":
   npm start -- install service
   npm start -- install game
   npm start -- install no-service    // uninstall service
```

## Requirements

- NodeJS > 14
	- used to run everything
	- install
		- Download: https://nodejs.org/en/download/
		- install using NVM: `nvm install 16.0.0`
			- NVM for Win: https://github.com/coreybutler/nvm-windows

- app modules
	- the ui has code dependencies
	- all OSs: `npm i`

- full-icu
	- globally installed for nodeJS
	- Install
		- all OSs: `npm install full-icu -g`

- NSSM (Windows)
	- user on `-- install service`
	- used by start / stop / update commands
	- Install
	- Download: https://nssm.cc/download -> You must use the pre-release `nssm 2.24-101-g897c7ad`!
		- WIN: install using Chocolatey: `choco install nssm`
- SteamCMD
	- used on `-- install game`
	- used by update game commands
	- Install
		- Download: https://developer.valvesoftware.com/wiki/SteamCMD#Downloading_SteamCMD
		- WIN: install using Chocolatey: `choco install steamcmd`
		- MacOS: brew install --cask steamcmd
		- Linux: apt install steamcmd

### OPTIONAL

- NVM
	- to handle NodeJS installations and to install NodeJS
- Microsoft IIS
	-  to host VSUI using iisnode
- iisnode
	- https://github.com/Azure/iisnode
- freedns.afraid.org
	- to have the Web UI available on a self hosted server
- FileZilla Server
	- alias the most important folders: game-logs, admin-ui-logs, world-file-folder, game folder for admin
	- Example folders related to my configuration:
		- ./iisnode
		- C:\Server-Games\valheimserver\config
		- C:\Server-Games\valheimserver\logs
		- C:\Server-Games\valheimserver\valheim_server_Data
		- C:\Server-Games\valheimserver\logs
		- C:\Users\Valheim Game Server\AppData\LocalLow\IronGate\Valheim

## License

The code is available at GitHub under the ISC license.

## Attribution

- `bcrypt` - MIT License
- `fs-extra` - MIT License
- `koa` - MIT License
- `koa-bodyparser` - MIT License
- `koa-router` - MIT License
- `koa-session` - MIT License
- `koa-static` - MIT License
- `node-vdf` - ISC License


## Possible future ideas for v.2

- pack using electron for releases (no NodeJS installation, no `npm start -- cmd` but `vaui --cmd` usage)
- use npm's SteamCMD to download SteamCMD
- use a setup script
- add a script to use appcmd.exe to add to IIS / include to download iisnode