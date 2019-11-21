"use strict";

module.exports.parseEmail = async event => {
  queryString = require("querystring");
  console.log(event);
  console.log(event.headers);
  console.log(event.body);
  console.log(typeof event.body);
  console.log(typeof event.headers);
  let body = new String(queryString.unescape(event.body));
  console.log("Body");
  console.log(body);

  return {
    statusCode: 200,
    body: "Hello"
  };
  let strip = body.match(/(stripped-html)/).index - 1;
  console.log("Strip");
  console.log(strip);
  let start = body.slice(strip).match(/(<html>)/).index;
  console.log("start");
  console.log(start);
  let end = body.slice(strip).match(/(<\/html>)/).index + 7;
  console.log("end");
  console.log(end);
  console.log(body.slice(start + strip, end + strip));
};
