const tf = require('@tensorflow/tfjs-node');
const axios = require("axios");
const Jimp = require("jimp");
require("dotenv").config();
const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);
const MessagingResponse = require("twilio").twiml.MessagingResponse;
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
client.messages
  .create({
    body: "Hi EcoWarrior 🌍!\nHow can I help you in waste segregation 🗑?\nUpload an image or mannually type the name of the item you want to dispose. ",
    from: `whatsapp:${process.env.SANDBOX_NO}`,
        to: `whatsapp:${process.env.PHONE_NO}`,
    })
    .then((message) => console.log(message.sid));
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

const makePredcition = async (url) => {
    const model = await tf.loadLayersModel("file://./model/model.json");
    const response = await axios.get(url, { responseType: "arraybuffer" });
    const image = await Jimp.read(response.data);
    const resized = tf.image.resizeBilinear(
      tf.browser.fromPixels(image.bitmap),
      [150, 150]
    );
    const normalized = resized.div(255.0);
    const batched = normalized.expandDims(0);
    const predictions = await model.predict(batched);
    const output = predictions.arraySync()[0];
    return output.indexOf(Math.max(...output));
}
const typeOfWaste = async (text) => {
    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: `In one word tell whether ${text} is recyclable, non-recyclable or organic.`,
      max_tokens: 7,
      temperature: 0,
    });
    const output = response.data.choices[0].text.trim();
    if (output.toLowerCase().includes("non-recyclable"))
        return 0;
    else if (output.toLowerCase().includes("organic"))
        return 1;
    else if (output.toLowerCase().includes("recyclable")) {
        return 2;
    } else
        return 3;
}
const getSendMessage = (input) => {
     if (input === 0) {
       return "Non-Recyclable. Try refurbishing it 🧐";
     } else if (input === 1) {
       return "Organic 🍆. Try making compost from it 👍";
     } else if (input === 2) {
       return "Yeah 🥳 it's recyclable. Earn money 💰 by giving it to nearby recycling centers.";
     } else {
       return "I am not sure 😢."  
     }
}
app.post("/whatsapp", async (req, res) => {
  const twiml = new MessagingResponse();
  const message = req.body.Body;
  const mediaUrl = req.body.MediaUrl0;
    if (message === "" && mediaUrl !== undefined) {
        const prediction = await makePredcition(mediaUrl);
        twiml.message(getSendMessage(prediction));
  } else {
        const type = await typeOfWaste(message);
        twiml.message(getSendMessage(type));  
  }
  res.set("Content-Type", "text/xml");
  res.send(twiml.toString());
});

app.listen(3001, () => {
  console.log("Express server listening on port 3000");
});
