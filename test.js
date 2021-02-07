const mergeImages = require('merge-images');
const { Canvas, Image } = require('canvas');
const fs = require("fs");
const mysql = require("mysql");

var sqlconfig = { //SQL Config
  user: 'root',
  password: 'root',
  server: 'localhost',
  port: 3306,
  database: 'weamc'
};
let con = mysql.createConnection(sqlconfig);
con.connect( function(err) {
  if (err) {
    console.log("Error Connecting to Database: " + err.message);
    return;
  };
  console.log("Connected to SQL DB!");
});

con.query(`SELECT username, hash FROM webcreds WHERE username = 'admin'`, function (err, recordset) { //Pulling hash from SQL DB
  if (err) { console.log(`SQL error: ${err.message}`) }
  console.log(recordset);
})