/* game configuration, the installs should be written to batch files or executed as block */
const gameStartConfig = {
    name: "ValheimGamers",
    world: "ValheimWorld",
    password: "password123!",
    port: "2456",          // must be accessable (port forwarding)
    isPublic: false,
    autostart: false,
};

/* in case nssm and steamcmd is placed in one folder you can use this setting - do not forget a \\ at the end ! */ 
const toolsBinPath = ""; // e.g.  "C:\\Server-Games\\ValheimAdminUI\\tools\\"

/* NOTE:
    IIS & iisnode: Admin UI Logs will be defined in web.config
    npm start: logs will be shown in the terminal
    npm start und save logs: you need to redirect the output like `npm start > all.log`
 */
exports.paths = {
	/* NSSM server logs, created by the valheim_server.exe output */
    serverLog: "C:\\Server-Games\\ValheimAdminUI\\valheim.game.out.log",
    serverLogError: "C:\\Server-Games\\ValheimAdminUI\\valheim.game.error.log",
    /* the `C:\\Users\\Valheim Game Server` folder results in the NSSM service user `NT Service\\Valheim Game Server` -- IIS is configured to match */
    worldFile: `C:\\Users\\Valheim Game Server\\AppData\\LocalLow\\IronGate\\Valheim\\worlds\\${gameStartConfig.world}.db`,
    /* acf/vdf -> buildid -> current server version */
    steamManifest: "C:\\Server-Games\\ValheimServer\\steamapps\\appmanifest_896660.acf",
    steamGameFolder: "C:\\Server-Games\\ValheimServer",
};

exports.cmds = {
    isRunning: {cmd: "tasklist", params: ["/FI", "IMAGENAME eq valheim_server.exe", "/NH"]},
    isUpdating: {cmd: "tasklist", params: ["/FI", "IMAGENAME eq steamcmd.exe", "/NH"]},

    /* service or app */
    start: {cmd: `${toolsBinPath}nssm.exe`, params: ["start", "Valheim Game Server"]},    // see: service-install block, "Valheim Game Server" must be the same every where in this file
    restart: {cmd: `${toolsBinPath}nssm.exe`, params: ["restart", "Valheim Game Server"]},
    stop: {cmd: `${toolsBinPath}nssm.exe`, params: ["stop", "Valheim Game Server"]},

    /* steam update command */
    update: {cmd: `${toolsBinPath}steamcmd.exe`, params: ["+login anonymous", "+force_install_dir \""+exports.paths.steamGameFolder+"\"", "+app_update 896660 validate", "+quit"]},
};

/* there is a stupid debug line in the game's logs - this is to remove it from view */
exports.logCleanupLine = '\n(Filename: C:\\buildslave\\unity\\build\\Runtime/Export/Debug/Debug.bindings.h Line: 35)';

/* put some random key in here, to protect the session cache */
exports.sessionKey = 'gw56ff&ne4338%snp8h1346sxd!e55eopkfhfjngh';


exports.scripts = {
	"game-install":
`
${toolsBinPath}steamcmd.exe +login anonymous +force_install_dir "${exports.paths.steamGameFolder}" +app_update 896660 validate +quit
`,
	"service-install":
`
echo "requires NSSM !"
${toolsBinPath}nssm.exe install "Valheim Game Server" "${exports.paths.steamGameFolder}\\valheim_server.exe"
${toolsBinPath}nssm.exe set "Valheim Game Server" AppParameters ^"-nographics -batchmode -name ^\\^"${gameStartConfig.name}^\\^" -port ${gameStartConfig.port} -world ^\\^"${gameStartConfig.world}^\\^" -password ^\\^"${gameStartConfig.password}^\\^" -public ${gameStartConfig.isPublic?1:0}^"
${toolsBinPath}nssm.exe set "Valheim Game Server" AppDirectory ${exports.paths.steamGameFolder}
${toolsBinPath}nssm.exe set "Valheim Game Server" AppExit Default Restart
${toolsBinPath}nssm.exe set "Valheim Game Server" AppStdout ${exports.paths.serverLog}
${toolsBinPath}nssm.exe set "Valheim Game Server" AppStderr ${exports.paths.serverLogError}
${toolsBinPath}nssm.exe set "Valheim Game Server" AppRotateFiles 1
${toolsBinPath}nssm.exe set "Valheim Game Server" AppRotateOnline 1
${toolsBinPath}nssm.exe set "Valheim Game Server" AppRotateBytes 2097152
${toolsBinPath}nssm.exe set "Valheim Game Server" DisplayName "Valheim Game Server"
${toolsBinPath}nssm.exe set "Valheim Game Server" ObjectName "NT Service\\Valheim Game Server"
${toolsBinPath}nssm.exe set "Valheim Game Server" Start ${gameStartConfig.autostart ? 'SERVICE_AUTO_START' : 'SERVICE_DEMAND_START'}
${toolsBinPath}nssm.exe set "Valheim Game Server" Type SERVICE_WIN32_OWN_PROCESS
`,

	"service-uninstall":
`
${toolsBinPath}nssm.exe uninstall "Valheim Game Server"
`,
};


/*
    1. Web UI port must be set on start
    2. Web UI port must be accessable (port forwarding)
    3. you must register at a dynamic domain service (freedns.afraid.org is free)
    4. your secret update url from the service is used to update
*/
exports.dynamicDns = {
    enabled: false,

    "urls": [
        {
            "name": "valheim-server.mooo.com",
            "host": "freedns.afraid.org",
            "path": "/dynamic/update.php?LHJKuhiGHKJuiGHKJKG7ziuHJKK",
            "port": 80
        }
    ],
    "interval": 300
}