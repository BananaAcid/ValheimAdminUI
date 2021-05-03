// (c) Nabil Redmann 2013
// License: MIT

import http from 'http';

const d = function(msg) {console.log(new Date(), 'dynamicDns:', msg); };


const app = {

    // config = {interval: int in secs, urls: [{name: string, host: string, path: string, port: int}, ..]}
    init: async (config) => {
        config = {interval: 300, ...config};

        d('init');

        d('updateing activated (' + config.interval + ' sec, ' + config.urls.length  + ' hosts)');

        function updateDNS() {
            let optBlock;
            for (let optBlockI in config.urls) {
                let opts = config.urls[optBlockI];
                d('processing ' + opts.name);

                (function () {
                    let optBlock = opts;
                    http.request(optBlock, function (res) {
                        
                        res.setEncoding('utf8');
                        
                        res.on('data', function (chunk) {
                            if (~chunk.toUpperCase().indexOf('NOT CHANGED'))
                                d('WARNING ' + optBlock.name + ' ' + chunk.trim());
                            else if (~chunk.toUpperCase().indexOf('ERROR'))
                                d('FAILED ' + optBlock.name + ' ' + chunk.trim());
                            else
                                d(optBlock.name + ' ' + chunk.trim());
                        });
                    }).on('error', function (e) {
                        d('FAILED ' + optBlock.name + ' ' + e.message);
                    }).end();
                }());
            }
        };
        updateDNS(); // init

        setInterval(updateDNS, config.interval*1000);
        
    }
};

export default app;
