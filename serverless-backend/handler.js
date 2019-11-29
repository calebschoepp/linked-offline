"use strict";

module.exports.parseEmail = async event => {
  let body;
  if (event.body) {
    body = JSON.parse(event.body);
  } else {
    console.error("No body to parse");
    return {
      statusCode: 400,
      body: "Event had no body"
    };
  }

  if (!body.strippedHTML) {
    return {
      statusCode: 400,
      body: "Body has no strippedHTML"
    };
  }
  const cheerio = require("cheerio");
  const $ = cheerio.load(body.strippedHTML);
  let links = $("a");
  $(links).each(function(i, link) {
    console.log($(link).text() + ":\n  " + $(link).attr("href"));
  });

  return {
    statusCode: 200,
    body: "Well done Caleb"
  };
};
