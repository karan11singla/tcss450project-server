//express is the framework we're going to use to handle requests 
const express = require('express');
//Create a new instance of express 
const app = express();
//Create connection to Heroku Database 
let db = require('../utilities/utils').db;
var router = express.Router();
const bodyParser = require("body-parser");
router.use(bodyParser.json());

/* Insert a new connection given the requester's username and the
   username of the contact to be added. Verified is auto initialized to 0. */
router.post("/addConnection", (req, res) => {
    let username = req.body['username'];
    let contactname = req.body['contactname'];
    if (!username || !contactname) {
        res.send({ success: false, error: "username or contactname not supplied" });
        return;
    }
    let select = `SELECT * FROM CONTACTS
                  WHERE MemberId_A = (SELECT MemberId FROM Members WHERE Username= $1) 
                  AND MemberId_B = (SELECT MemberId FROM Members WHERE Username= $2)
                  OR MemberId_A =(SELECT MemberId FROM Members WHERE Username= $2) 
                  AND MemberId_B=(SELECT MemberId FROM Members WHERE Username= $1);`
    db.result(select, [username, contactname])
        .then((result) => {
            if (result.rowCount != 0) {
                res.send({
                    success: false, error: "Connection already exists.",
                });
            }
            else {
                let insert = `INSERT INTO Contacts(MemberId_A, MemberId_B)
                              SELECT (SELECT MemberId FROM Members WHERE Username= $1) as MemberId_A,
                              (SELECT MemberId FROM Members WHERE Username= $2) as MemberId_B`

                db.none(insert, [username, contactname])
                    .then(() => { res.send({ success: true }); })
                    .catch((err) => {
                        res.send({
                            success: false, error: err,
                        });
                    });
            }
        })
        .catch((err) => {
            res.send({
                success: false, error: err,
            });
        });


});

// If the username and contactname are connected, remove it
router.post("/removeConnection", (req, res) => {
    let username = req.body['username'];
    let contactname = req.body['contactname'];
    if (!username || !contactname) {
        res.send({ success: false, error: "username or contactname not supplied" });
        return;
    }

    let del = `DELETE FROM Contacts
               WHERE (MemberId_A IN (SELECT MemberId FROM Members WHERE Username = $1) 
               AND MemberId_B IN (SELECT MemberId FROM Members WHERE Username = $2))
               OR (MemberId_A IN (SELECT MemberId FROM Members WHERE Username = $2) 
               AND MemberId_B IN (SELECT MemberId FROM Members WHERE Username = $1))`

    db.none(del, [username, contactname])
        .then(() => { res.send({ success: true }); })
        .catch((err) => {
            res.send({
                success: false, error: err,
            });
        });
});

// Get all the connections for the given username
router.post("/getConnections", (req, res) => {
    let username = req.body['username'];
    let query = `SELECT Firstname, Lastname, Email, Username, MemberId
                 FROM Members
                 JOIN Contacts ON MemberId = Contacts.MemberId_A OR MemberId = Contacts.MemberId_B
                 WHERE Username != $1 AND Verified = 1 AND (Contacts.MemberId_A = (SELECT MemberId From Members WHERE Username = $1) 
                 OR Contacts.MemberId_B = (SELECT MemberId From Members WHERE Username = $1))`
    db.result(query, [username]).then((result) => {
        if (result.rowCount == 0)
        {
            res.send({success: false, msg: "No Connections found."})
        }
        else
        {
            res.send({success: true, result: result['rows']})
        }
        
    }).catch((err) => {
        res.send({
            success: false, error: err
        })
    });
});

// Get all members who are not connected with the given memberid
router.post("/getUnconnectedMembers", (req, res) => {
    let id = req.body['memberId'];

    let query = `SELECT Members.Username From Members 
                INNER JOIN
                (SELECT MemberId as ID FROM Members 
                WHERE MemberId != $1 
                EXCEPT 
                (SELECT MemberId_B as ID FROM Contacts WHERE MemberId_A = $1 
                UNION 
                SELECT MemberId_A as ID FROM Contacts WHERE MemberId_B = $1)) AS Ids 
                ON Members.MemberId = IDs.ID`
 
                 
    db.result(query, [id]).then((result) => {
        if (result.rowCount == 0)
        {
            res.send({success: false, msg: "No Connections found."})
        }
        else
        {
            res.send({success: true, result: result['rows']})
        }
        
    }).catch((err) => {
        res.send({
            success: false, error: err
        })
    });
});
// Get an existing row in Contacts between two given users if it exists. Returns
// the verified status of the connection. Can be used to check if a request or contact
// already exists.
router.get("/getExistingConnectionStatus", (req, res) => {
    let username = req.query['username'];
    let contactname = req.query['contactname'];
    let query = `SELECT Verified 
                 FROM Contacts 
                 WHERE (MemberId_A=(SELECT MemberId from Members WHERE Username=$1) 
                 AND MemberId_B=(SELECT MemberId from Members WHERE Username=$2))
                 OR
                 (MemberId_A=(SELECT MemberId from Members WHERE Username=$2) 
                 AND MemberId_B=(SELECT MemberId from Members WHERE Username=$1))`
    db.manyOrNone(query, [username, contactname]).then((row) => {
        res.send({ messages: row })
    }).catch((err) => {
        res.send({
            success: false, error: err
        })
    });
});

// Gets all chats with the given username and contactname
router.get("/getChatWithContact", (req, res) => {
    let username = req.query['username'];
    let contactname = req.query['contactname'];
    let query = `SELECT ChatId
                 FROM ChatMembers
                 WHERE MemberId = (SELECT MemberId FROM Members WHERE Username = $1) AND
                 ChatId=Any(SELECT ChatId FROM ChatMembers WHERE MemberId=(SELECT MemberId FROM Members Where Username = $2))`
    db.manyOrNone(query, [username, contactname]).then((rows) => {
        res.send({ messages: rows })
    }).catch((err) => {
        res.send({
            success: false, error: err
        })
    });
});

module.exports = router;