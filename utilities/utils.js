//Get the connection to Heroku Database
let db = require('./sql_conn.js');
//We use this create the SHA256 hash
const crypto = require("crypto");
const FormData = require("form-data");
var nodemailer = require('nodemailer');
/** 
 * encrypt/decrypt found from : http://lollyrock.com/articles/nodejs-encryption/
 */

function encrypt(text, key){
  var cipher = crypto.createCipher('aes-256-cbc',key)
  var crypted = cipher.update(text,'utf8','hex')
  crypted += cipher.final('hex');
  return crypted.substring(0, 20);
}

function decrypt(text, key){
    var decipher = crypto.createDecipher('aes-256-cbc',key)
    var dec = decipher.update(text,'hex','utf8')
    dec += decipher.final('utf8');
    return dec;
}

/** 
 * Function to send emails. Derived from : https://www.w3schools.com/nodejs/nodejs_email.asp
 * @author Brandon Gaetaniello
 * @param {*} receiving is the email address receiving the email
 */
function sendVerificationEmail(receiving, url)
{
    db.one("SELECT Encrypted, Email, Key FROM GMAIL")
    .then(row => {
        let key = row['key'];
        let password = decrypt(row['encrypted'], key);
        let email = row['email'];
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: email,
              pass: password
            }
          });
    
        var mailOptions = {
            sending: email,
            to: receiving,
            subject: "Email Confirmation",
            text: "Please click the following link to confirm your email: " + url
          };
    
          transporter.sendMail(mailOptions, function(error, info){
            if (error) {
              console.log(error);
            } else {
              console.log('Email sent: ' + info.response);
            }
          });
    });
}

/**
* Method to get a salted hash.
* We put this in its own method to keep consistency
* @param {string} pw the password to hash
* @param {string} salt the salt to use when hashing
*/
function getHash(pw, salt) {
    return crypto.createHash("sha256").update(pw + salt).digest("hex");
}

function getCode() {
  var letters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  var confirm;
  var i;
  var inDatabase = false;
  confirm = "";
  for (i = 0; i < 20; i++)
  {
    confirm += letters.charAt(Math.random() * letters.length - 1);
  }
  return confirm;
}
module.exports = {
    db, getHash, sendVerificationEmail, getCode
};