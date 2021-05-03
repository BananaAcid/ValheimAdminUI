import { spawn } from 'child_process';

let getOutput = async function (cmdstr, paramsArr = []) {

    let out = [];

    let ex = _ => new Promise((resolve, reject) => {
        let p = spawn(cmdstr, paramsArr);


        p.stdout.on('data', function (data) {
            // console.log('stdout: ' + data.toString());
            let line = data.toString();
            out.push(line);
        });


        // contains processing info
        p.stderr.on('data', function (data) {
            // console.log('stderr: ' + data.toString());
            let line = data.toString();
            out.push(line);
        });

        p.on('exit', function (code) {
            resolve(code.toString());
        });

        p.on('error', e => {
            out.push(e.toString());
            resolve('ERROR');
        })
    });

    let code = await ex();

    //return {out, code};
    return out;
}


export { getOutput };