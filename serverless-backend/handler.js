"use strict";

module.exports.parseEmail = async event => {
  // queryString = require("querystring");
  console.log(typeof event.body);
  console.log(typeof event.headers);
  let body = new String(decodeURIComponent(event.body));
  console.log(typeof body);
  console.log("Body");
  console.log(body);

  let strip = body.match(/(stripped-html)/).index - 1;
  console.log("Strip");
  console.log(strip);
  let start = 0;
  try {
    start = body.slice(strip).match(/(<html>)/).index;
  } catch {
    console.log("Failed start regex");
  }
  console.log("start");
  console.log(start);
  let end = body.length;
  try {
    end = body.slice(strip).match(/(<\/html>)/).index + 7;
  } catch {
    console.log("failed end regex");
  }
  console.log("end");
  console.log(end);
  console.log(body.slice(start + strip, end + strip));
  return {
    statusCode: 200,
    body: "Hello"
  };
};
