var request = require('request'),
    URL = require('url'),
    Path = require('path'),
    fs = require('fs'),
    ProgressBar = require('progress'),
    DateUtils = require('date-utils'),
    Promise = require('promise'),
    mkdirp = require('mkdirp');

var baseUrl = 'http://letsmasterenglish.com/radio-api';
var path = 'podcasts';

var options = {
    isReverse: false,
    lme: false,
    ee: false
};

var args = process.argv.slice(2);

for (var i = 0; i < args.length; i++) {
    var val = args[i];

    switch (val) {
        case '--reverse':
        case '-r':
            options.isReverse = true;
            break;

        case '--limit':
        case '-l':
            i++;
            if (i < args.length) {
                options.limit = parseInt(args[i], 10);
            }
            break;

        case '--offset':
        case '-o':
            i++;
            if (i < args.length) {
                options.offset = parseInt(args[i], 10);
            }
            break;

        case 'lme':
            options.lme = true;
            break;

        case 'ee':
            options.ee = true;
            break;
    }
}

function download(url, path, file, callback) {
    if (!file) {
        file = Path.basename(URL.parse(url).pathname);
    }
    var pathname = path + '/' + file;

    fs.access(pathname, fs.F_OK, function (err) {
        if (!err) {
            console.log(file + ' exists\n');
            if (callback) {
                callback();
            }

            return;
        }

        request
            .get(url)
            .on('response', function(res) {
                var len = parseInt(res.headers['content-length'], 10);

                console.log('\033[1;37m' + url + '\033[0;0m:');
                var bar = new ProgressBar(file + ' [\033[0;32m:bar\033[0;0m] :percent :total :etas', {
                    complete: '*',
                    incomplete: ' ',
                    width: 30,
                    total: len
                });

                res.on('data', function(chunk) {
                    bar.tick(chunk.length);
                });

                res.on('end', function(chunk) {
                    console.log();
                    if (callback) {
                        callback();
                    }
                });
            })
            .on('error', function(err) {
                console.log(err);
            })
            .pipe(fs.createWriteStream(pathname));
    });
}

function downloadAll(url, path, filename, limit, offset) {

    mkdirp.sync(path);

    if (!offset) {
        offset = 0;
    }
    if (!limit) {
        limit = 10;
    }

    var pr = Promise.resolve();

    url = url + '?limit=' + limit + '&offset=' + offset;
    request(url, function(error, response, body) {
        if (!error) {
            var list = JSON.parse(body);

            if (options.isReverse) {
                list.reverse();
            }

            var total = 0;

            list.forEach(function(item) {
                var name;
                if (filename) {
                    name = filename + '-' + item.id + '-' + (new Date(item.pubDate)).toYMD();
                    name += '.mp3';
                }
                pr = pr.then(function() {
                    return new Promise(function (resolve) {
                        download(item.url, path, name, function() {
                            total++;
                            resolve();
                        });
                    });
                });
            });

            pr.then(function() {
                console.log('\033[0;33mTotal files downloaded: ' + total + '\033[0;0m');
            });
        } else {
            console.log(err);
        }
    })
}

if (options.lme) {
    console.log('\033[1;33m --------------- Let\'s Master English --------------- \033[0;0m');
    var lmeUrl = baseUrl + '/lme';
    var lmePath = path + '/lme';
    downloadAll(lmeUrl, lmePath, 'LetsMasterEnglish', options.limit, options.offset);
}

if (options.ee) {
    console.log('\033[1;33m --------------- Easy English Expressions --------------- \033[0;0m');
    var lmeUrl = baseUrl + '/ee';
    var lmePath = path + '/ee';
    downloadAll(lmeUrl, lmePath, 'EasyEnglishExpressions', options.limit, options.offset);
}
