import os from 'os';
import path from 'path';
import crypt from 'bcrypt';
import {inspect} from 'util';
import fsO, {promises as fs} from 'fs';
import fsExtra from 'fs-extra';

import Koa from 'koa';
import Router from 'koa-router';
import BodyParser from 'koa-bodyparser';
import serve from 'koa-static';
import Session from 'koa-session';

import { getOutput } from './helper.mjs';
import { exit } from 'process';

import vdf from 'node-vdf';
import DynamicDNS from './dynamicDns.mjs';

//import {pass as pwHash} from './config.pass.js';
let pwHash = JSON.parse(await fs.readFile(process.env.PASSWORDFILE || './app/config.passwords.json'));
const config_os = await import( process.env.CONFIGFILE || './config.' + os.platform() + '.js' );


if (process.argv[2] == '--enc' || process.argv[2] == 'enc') {
    if (!process.argv[3]) {
        console.error('to create a password hash:'
                   +'\n   npm start -- enc  newpassword'
                   +'\n   npm test  newpassword');
        console.error('to create a password hash and save with a user:'
                   +'\n   npm start -- enc  newpassword user.name'
                   +'\n   npm test  newpassword user.name');
        console.error('delete a user:'
                   +'\n   npm start -- enc  NULL user.name'
                   +'\n   npm test  NULL user.name');
        console.log('\nAdmin users:', Object.keys(pwHash).length)
        console.log(Object.keys(pwHash));
    }
    else {
        let newPw = crypt.hashSync(process.argv[3], 10);

        if (process.argv[4]) {
            if (process.argv[3].toLowerCase() == 'null') {
                delete pwHash[process.argv[4]];
                console.log('delete user', process.argv[4]);
                newPw = null;
            }
            else {
                pwHash[process.argv[4]] = newPw;
            }
            await fs.writeFile('./app/config.passwords.json', JSON.stringify(pwHash, false, 4));
        }

        if (newPw)
            console.log('hash:', newPw);
    }
    exit(0);
}

if (process.argv[2] == '--port' || process.argv[2] == 'port') {
    if (!process.argv[3]) {
        console.error('to use a specific port for the web ui:'
                   +'\n   npm start -- port 3000'
                   +'\n   WIN:    set PORT=3000 ; npm start'
                   +'\n   LINUX:  PORT=3000 npm start');
        exit(0);
    }
    else {
        process.env.PORT = +process.argv[3];
    }
}

if (process.argv[2] == '--install' || process.argv[2] == 'install') {
    if (!process.argv[3]) {
        console.error('install the "service" or "game":'
                   +'\n   npm start -- install service'
                   +'\n   npm start -- install game'
                   +'\n   npm start -- install no-service    // uninstall service');
    }
    else {
        switch (process.argv[3]) {
            case 'game': (async _=> getOutput(config_os.scripts['game-install']))(); break;
            case 'service': (async _=> getOutput(config_os.scripts['service-install']))(); break;
            case 'no-service': (async _=> getOutput(config_os.scripts['service-uninstall']))(); break;
        }
    }
    exit(0);
}


console.log(new Date(), 'OS', os.platform());
console.log(new Date(), 'Admin users:', Object.keys(pwHash));

let __dir_name = (typeof __dirname !== 'undefined') ? __dirname : (() => { let x = path.dirname(decodeURI(new URL(import.meta.url).pathname)); return path.resolve((process.platform == "win32") ? x.substr(1) : x); })();

let config = {
    ...config_os
};


/* cache module */
let cache = {
    ttl: 10*1000, // secs

    time: null,
    data: [],
};
cache = {...cache,
    ...{
        create: async (retProm, enforce) => {
            if (enforce || (cache.time <= +(new Date))) {
               cache.time = +(new Date) + cache.ttl;

               // console.log('CACHE refresh', {ttl: cache.ttl, next_time: cache.time, now:  +(new Date)});

               cache.data = await retProm();
            }
           
            return cache.data;
        },

        isValid: _ => (cache.time > +(new Date)),
        get: pos => cache.data[pos],
        getAll: _ => cache.data,
        has: pos => !!cache.data[pos]
    }
};


function log() {
    return async function (ctx, next) {
        //console.log( inspect(ctx) );
        await next();
    }
}


const app = new Koa();
const router = new Router();


router.get('/', (ctx,next) => {
    if (ctx.session.loggedin) {
        console.log(new Date(), 'Re-Login:', ctx.session.loggedin);

        ctx.redirect('/commands.html');
        return;
    }
    else
        return next();
});

router.post('/', (ctx, next) => {
    // ctx.router available
    let _POST = ctx.request.body;

    //console.log(ctx.request.body);


    if (ctx.session.loggedin || (_POST.username in pwHash && crypt.compareSync(_POST.password, pwHash[_POST.username]) )) {
        ctx.session.loggedin = _POST.username;

        console.log(new Date(), 'Login:', ctx.session.loggedin);

        ctx.redirect('/commands.html');
        return;
    }
    else {
        console.log(new Date(), 'Failed login:', _POST);
    }

    ctx.redirect('/');
    return;
    //return next(); // serve public html
});


router.get('/status.json', async (ctx, next) => {
    if (!ctx.session.loggedin) {
        ctx.status = 401;
        ctx.body = {error: 'unauthorized'};
        return;
    }


    let [lines1, lines2, logFileContent, worldFileStat, currentVersion] = await cache.create( 
        async() => await Promise.all([
            /* server running check */
            getOutput(config.cmds.isRunning.cmd, config.cmds.isRunning.params),
            /* update tool running */
            getOutput(config.cmds.isUpdating.cmd, config.cmds.isUpdating.params),
            /* get logfile */
            //reduce proccess load, but not good for multi user:   ('getlog' in ctx.request.query) ? fs.readFile('C:\\ftp\\marvin.redmann\\valheim.game.out.log', {encoding: 'utf8'}) : Promise.resolve(''),
            fs.readFile(config.paths.serverLog, {encoding: 'utf8'}),
            /* users world file status */
            fs.stat(config.paths.worldFile),
            /* read VDF file to get steam-app-version */
            new Promise(async success => {
                let res = '';
                try {
                    let fileContent = await fs.readFile(config.paths.steamManifest, {encoding: 'utf8'});
                    res = vdf.parse(fileContent);
                }
                catch (e) {
                    res = e.message;
                }

                success(res);
            }),
        ])
        , false //, ('getlog' in ctx.request.query) && !cache.has(2)
    );

    // reduce data transfer if not requested
    if (!('getlog' in ctx.request.query))
        logFileContent = '';


    let result = false;
    {
        lines1 = lines1.filter(Boolean); // remove empty lines;

        result = !lines1.length || lines1[0].indexOf('INFO') > -1 ? false : lines1.length > 0; // no results result in an `INFO: ...`
    }

    let result2 = false;
    {
        lines2 = lines2.filter(Boolean); // remove empty lines;

        result2 =  !lines2.length || lines2[0].indexOf('INFO') > -1 ? false : lines2.length > 0; // no results result in an `INFO: ...`
    }

    let result3 = '';
    let result3_2 = '';
    {
        result3 = logFileContent.replace(/[\r\n]+/g, '\n').replaceAll(config.logCleanupLine, '');

        let idx = logFileContent.lastIndexOf(':  Connections ') + ':  Connections '.length,
            idxEnd = logFileContent.indexOf(' ', idx);

        result3_2 = logFileContent.substring(idx, idxEnd);
    }

    let result4_1 = '',
        result4_2 = '',
        result4_3 = '',
        result4_4 = '';
    {
        let dateOptions = { timezone: 'Europe/Berlin', weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
        result4_1 = (new Date(worldFileStat.mtime)).toLocaleDateString('de-DE', dateOptions);
        result4_2 = (new Date(worldFileStat.birthtime)).toLocaleDateString('de-DE', dateOptions);

        let nextSave = new Date( +(new Date(worldFileStat.mtime)) + (20/* autosave mins */ * 60 * 1000) );
        result4_3 = nextSave.toLocaleDateString('de-DE', dateOptions);
        
        let diff = Math.abs(nextSave - new Date());
        let minutes = Math.floor((diff/1000)/60);
        result4_4 = minutes;
    }

    let result5_1 = '',
        result5_2 = '';
    {
        // currentVersion
        if (currentVersion.AppState) {
            let dateOptions2 = { timezone: 'Europe/Berlin', weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
            result5_1 = currentVersion.AppState.buildid;
            result5_2 = (new Date(+(currentVersion.AppState.LastUpdated + '000')/* js timestamp */)).toLocaleDateString('de-DE', dateOptions2);
        }
    }

    ctx.body = {running: result, updating: result2, log: result3, players: result3_2, world: {created: result4_2, lastAutoSave: result4_1, nextAutoSave: {at: result4_3, in: result4_4}}, currentVersion: {build: result5_1, lastUpdated: result5_2}};
});

router.get('/alive.json', async (ctx, next) => {

    let lines1 = cache.isValid() ? cache.get(0) : await getOutput(config.cmds.isRunning.cmd, config.cmds.isRunning.params);

    lines1 = lines1.filter(Boolean); // remove empty lines;

    let result = !lines1.length || lines1[0].indexOf('INFO') > -1 ? false : lines1.length > 0; // no results result in an `INFO: ...`

    ctx.body = {running: result};
});

router.all('/commands.html', async (ctx, next) => {
    // ctx.router available
    //ctx.request.body;

    if (!ctx.session.loggedin) {
        ctx.redirect('/');
        return;
    }
    
    let _POST = ctx.request.body;


    if (_POST) {
        console.log(new Date(), 'commands.html _POST:', _POST);

        if (_POST.action) console.log(new Date(), 'Action:', _POST.action, 'by', ctx.session.loggedin);
        switch(_POST.action) {
            case 'start': {

                let lines1 = await getOutput(config.cmds.start.cmd, config.cmds.start.params);
                console.log(lines1.join(''));

                ctx.body = lines1.join('<br>\n');
                ctx.redirect('/commands.html');
                break;
            }

            case 'stop': {

                let lines1 = await getOutput(config.cmds.stop.cmd, config.cmds.stop.params);
                console.log(lines1.join(''));

                ctx.body = lines1.join('<br>\n');
                ctx.redirect('/commands.html');
                break;
            }

            case 'restart': {

                let lines1 = await getOutput(config.cmds.restart.cmd, config.cmds.restart.params);
                console.log(lines1.join(''));

                ctx.body = lines1.join('<br>\n');
                ctx.redirect('/commands.html');
                break;
            }

            case 'update': {

                //let lines1 = await getOutput('nssm', ['start', "Valheim Server Game Updater"]);
                let lines1 = await getOutput(config.cmds.update.cmd, config.cmds.update.params);
                console.log(lines1.join(''));

                ctx.body = lines1.join('<br>\n');
                ctx.redirect('/commands.html');
                break;
            }

            case 'updaterestart': {

                let lines1 = await getOutput(config.cmds.stop.cmd, config.cmds.stop.params);
                console.log(lines1.join(''));
                let lines2 = await getOutput(config.cmds.update.cmd, config.cmds.update.params);
                console.log(lines2.join(''));
                let lines3 = await getOutput(config.cmds.start.cmd, config.cmds.start.params);
                console.log(lines3.join(''));

                ctx.body = lines1.join('<br>\n') + lines2.join('<br>\n') + lines3.join('<br>\n');
                ctx.redirect('/commands.html');
                break;
            }

            case 'backup': {

                let backupFolder = path.dirname(config.paths.worldFile) + '_' + new Date().toISOString().replace('T','_').replaceAll(':','-').split('.')[0];
                await fsExtra.copy(path.dirname(config.paths.worldFile), backupFolder);

                let lines1 = ['World backed up as: ' + backupFolder]; //await getOutput('cmd.exe', ["/C", "C:\\Server-Games\\valheimserver\\_backup.cmd"]);
                console.log(lines1.join(''));

                ctx.body = lines1.join('<br>\n');
                ctx.redirect('/commands.html');
                break;
            }

            case 'logout': {
                console.log(new Date(), 'Logout:', ctx.session.loggedin);
                ctx.session.loggedin = undefined;
                ctx.redirect('/');
                return;
                break;
            }

            default: {;}
        }
    }

    return next(); // serve public html
});



app.keys = [...config_os.sessionKey];

app
    .use(log())
    .use(Session(app))
    .use(BodyParser())
    .use(router.routes())
    .use(router.allowedMethods())
    .use(serve(path.join(__dir_name, '../public/')))
    ;

process.env.PORT = process.env.PORT || 3000;
app.listen(process.env.PORT);

console.log('Server listening on', process.env.PORT);


if (config_os.dynamicDns.enabled) {
    DynamicDNS.init(config_os.dynamicDns);
}