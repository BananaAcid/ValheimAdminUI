/*

	MacOS config

	... The UI part is cross platform, but the config needs service/pid-check OS dependend commands.

*/

exports = {};

exports.cmds = {
    isRunning: {cmd: "sh", params: ["-c", "ps aux | grep \"[v]alheim_server\""]},
    isUpdating: {cmd: "sh", params: ["-c", "ps aux | grep \"[s]teamcmd\""},

    // ...
}

exit(1);