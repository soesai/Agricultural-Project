'use strict';

var express = require('express'),
request = require('request'),
bodyparser = require('body-parser'),
mysql = require('mysql'),
sleep = require('system-sleep'),
app = express();
app.use(bodyparser.urlencoded({extended:false}));
app.use(bodyparser.json());


app.set('port', process.env.PORT || 3000);
app.use(express.static('public'));

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const SERVER_URL = process.env.SERVER_URL;
const APP_SECRET = process.env.APP_SECRET;

var domain_name = "https://4dae5b6d.ngrok.io";
var updateCLocation = "deactive";


app.listen(3000);
module.exports = app;

app.get('/webhook', function(req, res){
    
    if(req.query["hub.verify_token"]== "testBot")
    {
        res.send(req.query["hub.challenge"]);
    }
});

var connection = mysql.createConnection({
    host: 'sql12.freemysqlhosting.net',
    user: 'sql12313196',
    password: '6rWHLuLwZI',
    database: 'sql12313196'
});

connection.connect(function(error){
    if(!!error){
        console.log('Error');
    }else{
        console.log('Connected MySql Database.');
    }
});

app.get('/options', (req, res, next) => {
    let referer = req.get('Referer');
    if (referer) {
        if (referer.indexOf('www.messenger.com/') >= 0) {
            res.setHeader('X-Frame-Options', 'ALLOW-FROM https://www.messenger.com/');
        } else {
            res.setHeader('X-Frame-Options', 'ALLOW-FROM https://www.facebook.com/');
        }
        res.sendFile('public/options.html', {root: __dirname});
    }
});


var latest_msg = "";
var user_type = "";
var user_name = "";
var user_phone = "";
var user_address = "";
var user_image = "none";
var sender_id = 0;

app.post('/webhook', function(req, res){
    //console.log(req.params.id);
    console.log(sender_id);
    var msg_events = req.body.entry;
    msg_events.forEach(function(pageEntry){
        pageEntry.messaging.forEach(function(msg){
            if(msg.sender.id){
                sender_id = msg.sender.id;
                if(msg.message){
                    if(msg.message.text){
                        if(msg.message.text == "Hi")
                        {
                            //console.log(sender_id);
                            sendButton(msg.sender.id, "What is it?");
                        }else if(updateCLocation == "active"){
                            console.log("current location is" +msg.message.text);
                            SendCurrentLocation(msg.sender.id,msg.message.text);
                            updateCLocation == "deactive";
                        }else if(latest_msg == "What is your name"){
                            user_name = msg.message.text;
                            //sendText(msg.sender.id, "Your name is "+ user_name +". You is "+ user_type+".");
                            latest_msg = "What is your phone number.";
                            sendText(msg.sender.id, latest_msg);
                        }else if(latest_msg == "What is your phone number."){
                            user_phone = msg.message.text;
                            //sendText(msg.sender.id, "Your phone number is "+ user_phone);
                            latest_msg = "Tell your address.";
                            sendText(msg.sender.id, latest_msg);
                        }else if(latest_msg == "Tell your address."){
                            user_address = msg.message.text;
                            //sendText(msg.sender.id, "Your address is "+ user_address);
                            if(user_type=="Machine Owner"){
                                latest_msg = "Upload your machine photo";
                                sendText(msg.sender.id, latest_msg);
                            }else if(user_type=="Worker"){
                                sendText(msg.sender.id, "Successfully Worker Registration.");
                                UserInsert(sender_id);
                            }
                            else{
                                UserInsert(sender_id);
                                ButtonSearhResources(sender_id, "What do you search?");
                            }
                        }
                        
                    }
                    else if(msg.message.attachments){
                        if(latest_msg == "Upload your machine photo"){
                        let attachment = msg.message.attachments;
                        console.log(attachment[0].payload.url);
                        sendText(msg.sender.id, "Successfully Machine Registration.");
                        user_image = attachment[0].payload.url;
                        //sendImage(msg.sender.id, attachment[0].payload.url);
                        UserInsert(sender_id);
                        }
                        
                    }
                   
                }else if(msg.postback){
                    latest_msg = "What is your name";
                    if(msg.postback.payload == "bt_farmer"){
                        user_type = "Farmer";
                        sendText(msg.sender.id, latest_msg);
                    }else if(msg.postback.payload == "bt_machineOwner"){
                        user_type = "Machine Owner";
                        sendText(msg.sender.id, latest_msg);
                    }else if(msg.postback.payload == "bt_worker"){
                        user_type = "Worker";
                        sendText(msg.sender.id, latest_msg);
                    }else if(msg.postback.payload == "bt_searchMachine"){
                        getResources();
                    }else if (msg.postback.payload == "bt_searchWorker"){
                        getWorkerResources();
                    }
                    else if(msg.postback.payload.indexOf("bt_order")==0){
                        var oid = msg.postback.payload.slice(10);
                        console.log("owner id = "+oid);
                        selectMechineOrderDate(sender_id,oid);
                    }else if(msg.postback.payload.indexOf("bt_cancel")==0){
                        sendText(sender_id, "Canceled");
                    }else if(msg.postback.payload.indexOf("bt_receive_order_confirm")==0){
                        var oid = msg.postback.payload.slice(24);
                        console.log("comfirmed customer id = "+oid);
                        //sendText(oid,"Confrim from "+sender_id);
                        SendOrderConfirmation(sender_id,oid);
                    }
                    else if(msg.postback.payload == "get_started"){
                        sendText(msg.sender.id, "Hi");
                        sendButton(msg.sender.id, "What is it?");
                    }else if(msg.postback.payload == "menu_current_location"){
                        updateCLocation = "active";
                        sendText(msg.sender.id,"Tell your current location");
                    }
                    console.log(user_type);
                }else{
                    console.log("I don't know!");
                }
                res.sendStatus(200);
            }
        });
    });
});




function SendCurrentLocation(owner_id, location){
    connection.query("SELECT * FROM info_user WHERE owner_id = '"+owner_id+"'", function(error, rows, fields){
        if(!!error){
            console.log('Error in the query in getResourecs function');
        }else{
            for(var i=0; i< rows.length; i++)
            {
                console.log("Farmer name is "+rows[i].customer_id);
                var relevant_id = rows[i].customer_id;

                connection.query("SELECT * FROM user u, user_type ut WHERE u.user_id=ut.user_id AND u.sid='"+owner_id+"'", function(error, rows, fields){
                    if(!!error){
                        console.log('Error in the query in getResourecs function');
                    }else{
                        for(var j=0; j< rows.length; j++)
                        {
                            console.log("Owner name is "+rows[j].user_name);
                            var msg = "Current location of "+ rows[j].user_name+"("+rows[j].user_type_name+") is "+location+".\nPhone Number is "+rows[j].user_phone+"\nAddress is "+rows[j].user_address+".\n";
                            if(rows[j].user_type_name == "Worker"){
                                sendText(relevant_id, msg);
                            }else{
                                SendMachineOrderConfirmation(relevant_id, msg, rows[j].user_images);
                            }
                            sendText(owner_id,"Finish!");
                            sleep(2000);
                        }
                    }
                });
            }   
        }
    });
}


function SendOrderConfirmation(sid,oid){
    connection.query("SELECT * FROM user u, user_type ut WHERE u.user_id=ut.user_id AND u.sid='"+sid+"'", function(error, rows, fields){
        if(!!error){
            console.log('Error in the query in getResourecs function');
        }else{
            for(var i=0; i< rows.length; i++)
            {
                console.log("Owner name is "+rows[i].user_name);
                var msg = "Confirm from "+ rows[i].user_name+"("+rows[i].user_type_name+")"+".\nPhone Number is "+rows[i].user_phone+"\nAddress is "+rows[i].user_address+".\n";
                //sendResourcesImg(sender_id,msg, rows[i].user_images,rows[i].sid);
                if(rows[i].user_type_name == "Worker"){
                    sendText(oid, msg);
                }else{
                    SendMachineOrderConfirmation(oid, msg, rows[i].user_images);
                }
                sendText(sid,"Finish!");
                sleep(2000);
            }
        }
    });
}

async function getWorkerResources(){
    connection.query("SELECT * FROM user WHERE user_type = 'Worker'", function(error, rows, fields){
        if(!!error){
            console.log('Error in the query in getResourecs function');
        }else{
            for(var i=0; i< rows.length; i++)
            {
                console.log("Worker name is "+rows[i].user_name);
                var msg = "Worker name is "+ rows[i].user_name+".\nPhone Number is "+rows[i].user_phone+"\nAddress is "+rows[i].user_address+".\nCurrent Location is "+rows[i].current_location+".";
                SendAllButton(sender_id,msg,rows[i].user_id,rows[i].sid);
            }   
        }
    });
}

async function getResources(){
    connection.query("SELECT * FROM user u, user_type ut WHERE u.user_id=ut.user_id", function(error, rows, fields){
        if(!!error){
            console.log('Error in the query in getResourecs function');
        }else{
            for(var i=0; i< rows.length; i++)
            {
                console.log("Owner name is "+rows[i].user_name);
                var msg = "Owner name is "+ rows[i].user_name+".\nPhone Number is "+rows[i].user_phone+"\nAddress is "+rows[i].user_address+".\nCurrent Location is "+rows[i].current_location+".";
                sendResourcesImg(sender_id,msg, rows[i].user_images,rows[i].sid);
                sleep(2000);
                //SendAllButton(sender_id,msg,rows[i].user_id,rows[i].sid);
            }   
        }
    });
}


function SendOrderFromFarmer(sid,oid,order_info){
    connection.query("SELECT * FROM user WHERE sid = '"+sid+"'", function(error, rows, fields){
        if(!!error){
            console.log('Error in the query in getResourecs function');
        }else{
            for(var i=0; i< rows.length; i++)
            {
                console.log("Farmer name is "+rows[i].user_name);
                var msg = "Farmer name is "+ rows[i].user_name+".\nPhone Number is "+rows[i].user_phone+"\nAddress is "+rows[i].user_address+".\n "+order_info+".";
                sendOrder(oid, msg);
            }   
        }
    });
}


// Handle postback from webview
app.get('/getMachineOrderdate', (req, res) => {
    console.log("working");
    let body = req.query;
    let mod = body.mod;
    console.log("Order Date is : "+ mod+ " and time is : "+ body.mot);
    console.log("Owner id is : "+body.oid);
    InsertInfoUser(mod+" "+body.mot, sender_id, body.oid);
    var msg = "Order date is "+mod+" and time is "+body.mot;
    sendText(sender_id,"Finished order");
    SendOrderFromFarmer(sender_id,body.oid,msg);
    res.status(200).send('Please close this window to return to the conversation thread.');
});



function InsertInfoUser(order_date,cust_id,own_id){
    connection.query("INSERT INTO info_user(order_date,confirm,customer_id, owner_id) VALUES('"+order_date+"','"+'No'+"','"+cust_id+"','"+own_id+"')", function(error, rows, fields){
        if(!!error){
            console.log('Error in the query in inserting user table');
        }else{
            console.log('Successful query in inserting user table\n');
        }
    });
}

//var user_id = 0;
var getUserId = function UserSelect(callback){
    console.log("Phone is >>>>>>>>>>> "+user_phone);
    connection.query("SELECT user_id FROM user WHERE user_phone = '"+user_phone+"'", function(error, rows, fields){
        if(!!error){
            console.log('Error in the query in selecting user table');
        }else{
            console.log('Successful query in selecting user table.\n');
            connection.query("SELECT COUNT(*) FROM user", function(err, count, fields) {
                if (err) throw err;
                console.log('Query result: ', count.length);
                console.log("User id => "+rows[0].user_id);
              });
        }
        callback(null,rows[0].user_id);
    });
}

function UserInsert(sid){

    console.log("===================================================");
    console.log("User name = "+user_name);
    console.log("User phone = "+user_phone);
    console.log("User address = "+user_address);
    console.log("User type = "+user_type);
    console.log("User image url = "+user_image);
    console.log("sender id = "+ sid);
    console.log("===================================================");

    connection.query("INSERT INTO user(user_name,user_phone,user_address, user_type,sid) VALUES('"+user_name+"','"+user_phone+"','"+user_address+"','"+user_type+"','"+sid+"')", function(error, rows, fields){
        if(!!error){
            console.log('Error in the query in inserting user table');
        }else{
            console.log('Successful query in inserting user table 340\n');
        }
    });

    if(user_type != "Farmer"){

        console.log("Why Worker is not?");
        var ut = "'"+user_type+"'";
        var ui = "'"+user_image+"'";

        getUserId(function(err, uid){
            if(err){
                console.log('error in get user id');
            }else{
                console.log("User id ==> "+ uid);
                connection.query("INSERT INTO user_type(user_type_name,user_images,user_id) VALUES ("+ut+","+ui+",'"+uid+"')", function(error, rows, fields){
                    if(!!error){
                        console.log('Error in the query in inserting user_type table');
                    }else{
                        console.log('Successful query in inserting user type table.\n');
                        console.log(sender_id);
                    }
                });
            }
        });
    }
    
}


function SendMachineOrderConfirmation(id, message, imgUrl)
{
    request({
        url:"https://graph.facebook.com/v2.10/me/messages",
        qs:{access_token:"EAALAdLRA9ZBYBAAZBy4qZBmDWxpQuw5TcdqL3zzJqZBfzdAvjLSeZARaHZAEbVDT6dbyLEtihsxrC3i8veHArMNmEjTcoVmsRGAN9EEIVde3BCWB9AgB4Ea2OwFzhNZAQBhn0vP4OYWN3aXFz4k7li2DpAWOhL15SBb0UYZBe8EF6ZB6C9rQYoOX0d1SlYfAC2D8ZD"},
        method:"POST",
        json:{
            recipient:{id:id},
            message:{
                attachment:{
                    type: "template",
                    payload: {
                        template_type:"generic",
                        elements:[
                           {
                            title:"Machine",
                            image_url:imgUrl,
                            subtitle:message,
                          }
                        ]
                      }
                }
            }
        }
    });
}



function sendResourcesImg(id, message, imgUrl, sid)
{
    request({
        url:"https://graph.facebook.com/v2.10/me/messages",
        qs:{access_token:"EAALAdLRA9ZBYBAAZBy4qZBmDWxpQuw5TcdqL3zzJqZBfzdAvjLSeZARaHZAEbVDT6dbyLEtihsxrC3i8veHArMNmEjTcoVmsRGAN9EEIVde3BCWB9AgB4Ea2OwFzhNZAQBhn0vP4OYWN3aXFz4k7li2DpAWOhL15SBb0UYZBe8EF6ZB6C9rQYoOX0d1SlYfAC2D8ZD"},
        method:"POST",
        json:{
            recipient:{id:id},
            message:{
                attachment:{
                    type: "template",
                    payload: {
                        template_type:"generic",
                        elements:[
                           {
                            title:"Machine",
                            image_url:imgUrl,
                            subtitle:message,
                            buttons:[
                                {
                                    type:"postback",
                                    title:"Order",
                                    payload:"bt_order *"+sid
                                },
                                {
                                    type:"postback",
                                    title:"Cancel",
                                    payload:"bt_cancel *"+sid
                                }
                            ]      
                          }
                        ]
                      }
                }
            }
        }
    });
}


function sendOrder(id, message)
{
    request({
        url:"https://graph.facebook.com/v2.10/me/messages",
        qs:{access_token:"EAALAdLRA9ZBYBAAZBy4qZBmDWxpQuw5TcdqL3zzJqZBfzdAvjLSeZARaHZAEbVDT6dbyLEtihsxrC3i8veHArMNmEjTcoVmsRGAN9EEIVde3BCWB9AgB4Ea2OwFzhNZAQBhn0vP4OYWN3aXFz4k7li2DpAWOhL15SBb0UYZBe8EF6ZB6C9rQYoOX0d1SlYfAC2D8ZD"},
        method:"POST",
        json:{
            recipient:{id:id},
            message:{
                attachment:{
                    type: "template",
                    payload:{
                        template_type: "button",
                        text: message,
                        buttons:[
                            {
                                type:"postback",
                                title:"Confrim",
                                payload:"bt_receive_order_confirm"+sender_id
                            }
                        ]
                    }
                }
            }
        }
    });
}



function selectMechineOrderDate(id, oid) {

    request({
        url:"https://graph.facebook.com/v2.10/me/messages",
        qs:{access_token:"EAALAdLRA9ZBYBAAZBy4qZBmDWxpQuw5TcdqL3zzJqZBfzdAvjLSeZARaHZAEbVDT6dbyLEtihsxrC3i8veHArMNmEjTcoVmsRGAN9EEIVde3BCWB9AgB4Ea2OwFzhNZAQBhn0vP4OYWN3aXFz4k7li2DpAWOhL15SBb0UYZBe8EF6ZB6C9rQYoOX0d1SlYfAC2D8ZD"},
        method:"POST",
        json:{
            recipient:{id:id},
            message:{
                attachment:{
                    type: "template",
                    payload: {
                    template_type: "button",
                    text: "Click the button to select Date",
                    buttons: [{
                    type: "web_url",
                    url: domain_name+"/msgBot/options.html?oid="+oid,
                    title: "Date & Time",
                    webview_height_ratio: "tall",
                    messenger_extensions: true
                    }]
                }
                }
            }
        }
    });
}


function sendText(id, message){
    request({
        url:"https://graph.facebook.com/v2.10/me/messages",
        qs:{access_token:"EAALAdLRA9ZBYBAAZBy4qZBmDWxpQuw5TcdqL3zzJqZBfzdAvjLSeZARaHZAEbVDT6dbyLEtihsxrC3i8veHArMNmEjTcoVmsRGAN9EEIVde3BCWB9AgB4Ea2OwFzhNZAQBhn0vP4OYWN3aXFz4k7li2DpAWOhL15SBb0UYZBe8EF6ZB6C9rQYoOX0d1SlYfAC2D8ZD"},
        method:"POST",
        json:{
            recipient:{id:id},
            message:{text:message}
        }
    });
}





function sendButton(id, message)
{
    request({
        url:"https://graph.facebook.com/v2.10/me/messages",
        qs:{access_token:"EAALAdLRA9ZBYBAAZBy4qZBmDWxpQuw5TcdqL3zzJqZBfzdAvjLSeZARaHZAEbVDT6dbyLEtihsxrC3i8veHArMNmEjTcoVmsRGAN9EEIVde3BCWB9AgB4Ea2OwFzhNZAQBhn0vP4OYWN3aXFz4k7li2DpAWOhL15SBb0UYZBe8EF6ZB6C9rQYoOX0d1SlYfAC2D8ZD"},
        method:"POST",
        json:{
            recipient:{id:id},
            message:{
                attachment:{
                    type: "template",
                    payload:{
                        template_type: "button",
                        text: "Are you?",
                        buttons:[
                            {
                                type:"postback",
                                title:"Farmer",
                                payload:"bt_farmer"
                            },
                            {
                                type:"postback",
                                title:"Machine Owner",
                                payload:"bt_machineOwner"
                            },
                            {
                                type:"postback",
                                title:"Worker",
                                payload:"bt_worker"
                            }
                        ]
                    }
                }
            }
        }
    });
}



function ButtonSearhResources(id, message)
{
    request({
        url:"https://graph.facebook.com/v2.10/me/messages",
        qs:{access_token:"EAALAdLRA9ZBYBAAZBy4qZBmDWxpQuw5TcdqL3zzJqZBfzdAvjLSeZARaHZAEbVDT6dbyLEtihsxrC3i8veHArMNmEjTcoVmsRGAN9EEIVde3BCWB9AgB4Ea2OwFzhNZAQBhn0vP4OYWN3aXFz4k7li2DpAWOhL15SBb0UYZBe8EF6ZB6C9rQYoOX0d1SlYfAC2D8ZD"},
        method:"POST",
        json:{
            recipient:{id:id},
            message:{
                attachment:{
                    type: "template",
                    payload:{
                        template_type: "button",
                        text: message,
                        buttons:[
                            {
                                type:"postback",
                                title:"Machine",
                                payload:"bt_searchMachine"
                            },
                            {
                                type:"postback",
                                title:"Worker",
                                payload:"bt_searchWorker"
                            }
                        ]
                    }
                }
            }
        }
    });
}


function SendAllButton(id, message, uid, sid)
{
    request({
        url:"https://graph.facebook.com/v2.10/me/messages",
        qs:{access_token:"EAALAdLRA9ZBYBAAZBy4qZBmDWxpQuw5TcdqL3zzJqZBfzdAvjLSeZARaHZAEbVDT6dbyLEtihsxrC3i8veHArMNmEjTcoVmsRGAN9EEIVde3BCWB9AgB4Ea2OwFzhNZAQBhn0vP4OYWN3aXFz4k7li2DpAWOhL15SBb0UYZBe8EF6ZB6C9rQYoOX0d1SlYfAC2D8ZD"},
        method:"POST",
        json:{
            recipient:{id:id},
            message:{
                attachment:{
                    type: "template",
                    payload:{
                        template_type: "button",
                        text: message,
                        buttons:[
                            {
                                type:"postback",
                                title:"Order",
                                payload:"bt_order *"+sid
                            },
                            {
                                type:"postback",
                                title:"Cancel",
                                payload:"bt_cancel *"+sid
                            }
                        ]
                    }
                }
            }
        }
    });
}





function sendImage(id, message)
{
    request({
        url:"https://graph.facebook.com/v2.10/me/messages",
        qs:{access_token:"EAALAdLRA9ZBYBAAZBy4qZBmDWxpQuw5TcdqL3zzJqZBfzdAvjLSeZARaHZAEbVDT6dbyLEtihsxrC3i8veHArMNmEjTcoVmsRGAN9EEIVde3BCWB9AgB4Ea2OwFzhNZAQBhn0vP4OYWN3aXFz4k7li2DpAWOhL15SBb0UYZBe8EF6ZB6C9rQYoOX0d1SlYfAC2D8ZD"},
        method:"POST",
        json:{
            recipient:{id:id},
            message:{
                attachment:{
                    type: "image",
                    payload:{
                        //url: " https://scontent-msp1-1.xx.fbcdn.net/v/t1.15752-9/72040425_404792826844461_5949338971287846912_n.jpg?_nc_cat=104&_nc_oc=AQmxfN_DAJukOVARZ2tA7ruT7MYEyCKxQAKPP2vsUgecvQ-qygK3AC7W15ge63INHFO2EMCrcGPvaavruA6Olslj&_nc_ad=z-m&_nc_cid=0&_nc_zor=9&_nc_ht=scontent-msp1-1.xx&oh=1f36fa87f9d0181b5e06a2946e0d6547&oe=5DF110A3"
                        //file:"file:///C:/Users/Soe%20Kyaw%20Thu/Pictures/AlphaZawgyi.jpg"
                        url:message
                    }
                }
            }
        }
    });

    //await callSendAPI(sendImage);
}




/*
message:{
                attachment:{
                    type: "template",
                    payload:{
                        template_type: "text",
                        text: "What do you want to do next?",
                        text:[
                            {
                                type: "web_url",
                                url: "https://petersapparel.parseapp.com",
                                title: "Show Website"
                            },
                            {
                                type:"postback",
                                title:"Start Chatting",
                                payload:"someshit"
                            }
                        ]
                    }
                }
            }
*/