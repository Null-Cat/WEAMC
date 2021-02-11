const http = require("http");
const url = require("url");
const fs = require("fs");
const cookie = require("cookie");
const crypto = require("crypto");
const formidable = require("formidable");
const mergeImages = require('merge-images');
const { Canvas, Image } = require('canvas');
const lookup = require("mime-types").lookup;
const mysql = require("mysql");
const request = require("request")

var serverInfo = { playercount: '0', memorymax: '1024MB', memoryused: '0MB' }; //Init server info

var sqlconfig = { //SQL Config
    user: 'root',
    password: 'root',
    server: 'localhost',
    port: 3306,
    database: 'weamc'
};
let con = mysql.createConnection(sqlconfig);
con.connect(function (err) {
    if (err) {
        console.log("Error Connecting to Database: " + err.message);
        return;
    };
    console.log("Connected to SQL DB!");
});

const server = http.createServer((req, res) => {
    function isEmptyObject(obj) {
        return !Object.keys(obj).length;
    }

    function blockpath(block) {
        try {
            if (fs.existsSync(__dirname + "/block/" + block.toLowerCase() + "_top.png")) {
                return __dirname + "/block/" + block.toLowerCase() + "_top.png";
            } else {
                try {
                    if (fs.existsSync(__dirname + "/block/" + block.toLowerCase() + ".png")) {
                        return __dirname + "/block/" + block.toLowerCase() + ".png";
                    }
                } catch (err) {
                    console.log(`Unknown texture: ${block}\nTested path: ${__dirname}/block/${block.toLowerCase()}.png/_top.png`);
                    return __dirname + "/block/red_shulker_box.png"; //Unable to find texture so default to red shulker box texture
                }
            }
        } catch (err) {
            try {
                if (fs.existsSync(__dirname + "/block/" + block.toLowerCase() + ".png")) {
                    return __dirname + "/block/" + block.toLowerCase() + ".png";
                }
            } catch (err) {
                console.log(`Unknown texture: ${block}\nTested path: ${__dirname}/block/${block.toLowerCase()}.png/_top.png`);
                return __dirname + "/block/red_shulker_box.png"; //Unable to find texture so default to red shulker box texture
            }
        }
        return __dirname + "/block/red_shulker_box.png";
    }

    // Merge Sort
    function merge(left, right) {
        let resultArray
        let leftIndex = 0
        let rightIndex = 0

        while (leftIndex < left.length && rightIndex < right.length) {
            if (left[leftIndex] < right[rightIndex]) {
                resultArray.push(left[leftIndex]);
                leftIndex++; // move left array cursor
            } else {
                resultArray.push(right[rightIndex]);
                rightIndex++; // move right array cursor
            }
        }
        return resultArray.concat(left.slice(leftIndex)).concat(right.slice(rightIndex));
    }

    function mergeSort(unsortedArray) {
        if (unsortedArray.length <= 1) { //don't sort if too small or empty
            return unsortedArray;
        }
        const middle = Math.floor(unsortedArray.length / 2); //middle
        const left = unsortedArray.slice(0, middle); // splitting the array into left and right
        const right = unsortedArray.slice(middle);

        // Using recursion to combine the left and right
        return merge(mergeSort(left), mergeSort(right));
    }

    function usingAuthenticatedCookie(cookie) {
        con.query(`SELECT sessionid FROM sessions WHERE sessionid = '${cookie}'`, function (err, recordset) { //Pulling hash from SQL DB
            if (err) { console.log(`SQL error: ${err.message}`); return false }
            if (isEmptyObject(recordset)) {
                return false;
            } else {
                return true;
            }
        })
    }

    let parsedURL = url.parse(req.url, true);
    let path = parsedURL.path.replace(/^\/+|\/+$/g, ""); //remove the leading and trailing slashes
    if (path == "") {
        path = "index.html";
    }
    console.log(`Requested path ${path} from ${req.socket.remoteAddress}`);

    if (req.method.toLowerCase() === 'post' && path === 'indexp') { //Login Page Hanling
        let form = new formidable.IncomingForm();
        form.parse(req, function (err, fields, files) {
            if (err) {
                console.log(`Form error: ${err.message}`);
                return;
            }
            let jsonfields = fields
            console.log(jsonfields.user);
            con.query(`SELECT username, hash FROM webcreds WHERE username = '${jsonfields.user}'`, function (err, recordset) { //Pulling hash from SQL DB
                if (err) { console.log(`SQL error: ${err.message}`) }
                console.log(recordset)
                if (isEmptyObject(recordset)) {
                    console.log("Not in DB")
                    res.writeHead(302, { 'Location': "index.html" });
                    res.end();
                } else {
                    console.log(`DB: ${recordset[0].username} ${recordset[0].hash}`)
                    if (jsonfields.user === recordset[0].username && jsonfields.pass === recordset[0].hash) { //add session id to DB if authenticated
                        let clientsessionid = cookie.parse(req.headers.cookie || '').SessionId
                        con.query(`INSERT INTO sessions(sessionid, username) VALUES ('${clientsessionid}', '${recordset[0].username}')`, function (err, recordset) {
                            if (err) { console.log(`SQL error: ${err.message}`) };
                        });
                        console.log(`Authenticated session ${clientsessionid}`)
                        res.writeHead(302, { 'Location': "dashboard/dashboard.html" });
                        res.end();
                    } else {
                        console.log("Access Denied")
                        res.writeHead(302, { 'Location': "index.html" });
                        res.end();
                    }
                }
            });
        });
    } else if (req.method.toLowerCase() === 'post' && path === 'pluginrequest') { //handles plugin requests
        let form = new formidable.IncomingForm();
        form.parse(req, function (err, fields, files) {
            if (err) {
                console.log(`Form error: ${err.message}`);
                return;
            }
            //console.log(fields);
            serverInfo = fields;
            res.statusCode = 200;
            res.end();
        });
    } else if (req.method.toLowerCase() === 'post' && path === 'processchunk') { //handles chunk requests
        let form = new formidable.IncomingForm();
        form.parse(req, function (err, fields, files) {
            if (err) {
                console.log(`Form error: ${err.message}`);
                return;
            }
            console.log(`${fields.x},${fields.y}`)
            con.query(`SELECT intercoords, blockid FROM chunks WHERE wcoords = '${fields.x},${fields.y}'`, function (err, recordset) {
                if (err) { console.log(`SQL error: ${err.message}`) }
                //console.log(recordset)
                if (isEmptyObject(recordset)) {
                    console.log("Not in DB")
                    res.writeHead(500);
                    res.end();
                } else {
                    console.log(`Processing Chunk: ${fields.x}, ${fields.y}`)
                    let chunks = [];
                    let chunk0 = new Array(15);
                    let chunk1 = new Array(15);
                    let chunk2 = new Array(15);
                    let chunk3 = new Array(15);
                    let chunk4 = new Array(15);
                    let chunk5 = new Array(15);
                    let chunk6 = new Array(15);
                    let chunk7 = new Array(15);
                    let chunk8 = new Array(15);
                    let chunk9 = new Array(15);
                    let chunk10 = new Array(15);
                    let chunk11 = new Array(15);
                    let chunk12 = new Array(15);
                    let chunk13 = new Array(15);
                    let chunk14 = new Array(15);
                    let chunk15 = new Array(15);
                    for (const item of recordset) {
                        //console.log(blockpath(item.blockid)+item.blockid)
                        let x = parseInt(item.intercoords.split(",")[0]);
                        let y = parseInt(item.intercoords.split(",")[1]);
                        //console.log(x + ":" + y);
                        switch (x) {
                            case 0:
                                chunk0.splice(y, 0, { src: blockpath(item.blockid), x: x * 16, y: y * 16 });
                                break;
                            case 1:
                                chunk1.splice(y, 0, { src: blockpath(item.blockid), x: x * 16, y: y * 16 });
                                break;
                            case 2:
                                chunk2.splice(y, 0, { src: blockpath(item.blockid), x: x * 16, y: y * 16 });
                                break;
                            case 3:
                                chunk3.splice(y, 0, { src: blockpath(item.blockid), x: x * 16, y: y * 16 });
                                break;
                            case 4:
                                chunk4.splice(y, 0, { src: blockpath(item.blockid), x: x * 16, y: y * 16 });
                                break;
                            case 5:
                                chunk5.splice(y, 0, { src: blockpath(item.blockid), x: x * 16, y: y * 16 });
                                break;
                            case 6:
                                chunk6.splice(y, 0, { src: blockpath(item.blockid), x: x * 16, y: y * 16 });
                                break;
                            case 7:
                                chunk7.splice(y, 0, { src: blockpath(item.blockid), x: x * 16, y: y * 16 });
                                break;
                            case 8:
                                chunk8.splice(y, 0, { src: blockpath(item.blockid), x: x * 16, y: y * 16 });
                                break;
                            case 9:
                                chunk9.splice(y, 0, { src: blockpath(item.blockid), x: x * 16, y: y * 16 });
                                break;
                            case 10:
                                chunk10.splice(y, 0, { src: blockpath(item.blockid), x: x * 16, y: y * 16 });
                                break;
                            case 11:
                                chunk11.splice(y, 0, { src: blockpath(item.blockid), x: x * 16, y: y * 16 });
                                break;
                            case 12:
                                chunk12.splice(y, 0, { src: blockpath(item.blockid), x: x * 16, y: y * 16 });
                                break;
                            case 13:
                                chunk13.splice(y, 0, { src: blockpath(item.blockid), x: x * 16, y: y * 16 });
                                break;
                            case 14:
                                chunk14.splice(y, 0, { src: blockpath(item.blockid), x: x * 16, y: y * 16 });
                                break;
                            case 15:
                                chunk15.splice(y, 0, { src: blockpath(item.blockid), x: x * 16, y: y * 16 });
                                break;
                        }
                    }
                    chunks = chunk0.concat(chunk1, chunk2, chunk3, chunk4, chunk5,
                        chunk6, chunk7, chunk8, chunk9, chunk10,
                        chunk11, chunk12, chunk13, chunk14, chunk15);
                    //console.log(chunks);
                    //console.log(chunk0);
                    let filteredChunks = chunks.filter(function (el) { return el != null });
                    mergeImages(filteredChunks, { Canvas: Canvas, Image: Image, width: 256, height: 256 }).then((img) => {
                        //console.log(img);
                        fs.promises.mkdir(__dirname + `/public/renderedchunks/5/${fields.x}/`, { recursive: true }).catch(console.error);
                        var base64Data = img.replace(/^data:image\/png;base64,/, ""); //Remove file headers
                        fs.writeFile(__dirname + `/public/renderedchunks/5/${fields.x}/${fields.y}.png`, base64Data, 'base64', function (err) { console.log(err); });
                        console.log(`Rendered Chunk: ${fields.x}, ${fields.y}`)
                    });
                }
            });
            console.log(fields);
            res.statusCode = 200;
            res.end();
        });
    } else if (path !== 'index.html' && usingAuthenticatedCookie(cookie.parse(req.headers.cookie || '').SessionId) === false) {
        res.setHeader('Location', '/')
        res.statusCode = 302;
        res.end();
        return;
    } else if (path === 'dashboard/dashboard.html') {
        fs.readFile(__dirname + "/public/dashboard/dashboard.html", function (err, content) {
            console.log(`Returning ${path}`);
            let editedcontent = content.toString().replace("playercount", serverInfo.playercount)
                .replace("memoryusage", `${serverInfo.memoryused}/${serverInfo.memorymax}`);
            res.setHeader("X-Content-Type-Options", "nosniff"); //nosniff so the browser doesn't guess mime type
            res.writeHead(200, { "Content-type": "text/html" }); //specify the content type in the response for proper browser interpretation
            res.end(editedcontent);
        });
    } else if (path === 'players/players.html') {
        let playerlist = '';
        fs.readFile(__dirname + "/public/players/players.html", function (err, content) {
            console.log(`Returning ${path}`);
            con.query("SELECT * FROM players", function (err, recordset) {
                if (err) { console.log(`SQL error: ${err.message}`) }
                console.log(recordset)
                if (isEmptyObject(recordset)) {
                    console.log("No players in DB")
                    playerlist = `<div class="player"><h1>No Players Found</h1></div>`
                    let editedcontent = content.toString().replace("<!--playerlist-->", playerlist);
                    res.setHeader("X-Content-Type-Options", "nosniff"); //nosniff so the browser doesn't guess mime type
                    res.writeHead(200, { "Content-type": "text/html" }); //specify the content type in the response for proper browser interpretation
                    res.end(editedcontent);
                } else {
                    for (i = 0; i < recordset.length; i++) {
                        playerlist = playerlist + `<div class="player"><a href = "/players/player?user=${recordset[i].username}">` + recordset[i].username + '</a></div>'
                    }
                    console.log(playerlist)
                    let editedcontent = content.toString().replace("<!--playerlist-->", playerlist);
                    res.setHeader("X-Content-Type-Options", "nosniff"); //nosniff so the browser doesn't guess mime type
                    res.writeHead(200, { "Content-type": "text/html" }); //specify the content type in the response for proper browser interpretation
                    res.end(editedcontent);
                }
            })
        });
    } else if (path.search(/players\/player\?user\=/i) >= 0) {
        console.log('Players')
        fs.readFile(__dirname + '/public/players/player.html', function (err, content) {
            console.log(`Returning ${path}`);
            let editedcontent = content.toString().replace("playername", url.parse(req.url, true).query.user);

            res.setHeader("X-Content-Type-Options", "nosniff"); //nosniff so the browser doesn't guess mime type
            res.writeHead(200, { "Content-type": "text/html" }); //specify the content type in the response for proper browser interpretation
            res.end(editedcontent);
        });
    } else if (path.search(/command\?*/i) >= 0) { //Forwards command to minecraft server
        console.log('command');

        request(`http://127.0.0.1:2649/${path}`, { json: true }, (err, res, body) => {
            if (err) { return console.log(err); }
        });

        res.writeHead(200)
        res.end();
    } else {
        let file = __dirname + "/public/" + path //.substring(0, function () { if (path.indexOf("?") === -1) { return path.length - 1 } else { return path.indexOf("?") - 1 } });
        fs.readFile(file, function (err, content) { //normal page rendering/handling this also includes any file hosted on server such as css and js
            let mime = lookup(file);
            //console.log(mime)
            if (err) {
                console.log(`File Not Found ${file}`);
                res.writeHead(404);
                res.end();
            } else if (mime === "image/png") {
                console.log(`Returning ${path}`);
                res.setHeader("X-Content-Type-Options", "nosniff"); //nosniff so the browser doesn't guess mime type
                res.writeHead(200, { "Content-type": mime }); //specify the content type in the response for proper browser interpretation
                res.end(content);
                return;
            } else {
                let cookies = req.headers.cookie
                //console.log(cookie.parse(req.headers.cookie || ''));
                if (cookies === undefined) {
                    let id = crypto.randomBytes(20).toString('hex')
                    res.setHeader('Set-Cookie', cookie.serialize('SessionId', id, { maxAge: 3600, path: '/' }));
                    console.log(path)
                    res.setHeader('Location', '/')
                    res.statusCode = 302;
                    res.end();
                    return;
                }
                console.log(`Returning ${path} to ${req.socket.remoteAddress}`);
                res.setHeader("X-Content-Type-Options", "nosniff"); //nosniff so the browser doesn't guess mime type
                res.writeHead(200, { "Content-type": mime }); //specify the content type in the response for proper browser interpretation
                res.end(content);
            }
        });
    }
});
server.listen(80, "localhost", () => { //Start server
    console.log("Listening on port 80");
});