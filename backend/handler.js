"use strict";

module.exports.parseEmail = async event => {
  console.log(event);
  let data = {};
  try {
    data = JSON.parse(event.body);
  } catch (jsonError) {
    console.log("There was an error parsing the body", jsonError);
    return {
      statusCode: 400
    };
  }

  if (typeof data["stripped-html"] === "undefined") {
    console.log("stripped-html was not parameter");
    return {
      statusCode: 400
    };
  }

  console.log(data["stripped-html"]);

  return {
    statusCode: 201
  };
};
