const dotenv = require('dotenv');
const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const userHelper = require('./helpers/userHelper');
var db = require('./config/connection');
const session = require('express-session');

const app = express();
const port = 3001;

const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function getGeminiResponse(prompt) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error fetching AI response:", error);
    return "Error processing the resume. Please try again.";
  }
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/upload', upload.single('resume'), async (req, res) => {
  if (!req.file || !req.body.jd) {
    return res.status(400).json({ error: "Missing resume file or job description" });
  }

  const jd = req.body.jd;
  const resumePath = req.file.path;

  try {
    const dataBuffer = fs.readFileSync(resumePath);
    const pdfText = await pdfParse(dataBuffer);

    const inputPrompt = `
      You are an ATS system for technical hiring. Analyze the resume and compare it to the job description. 

      **Resume Content:**
      ${pdfText.text}

      **Job Description:**
      ${jd}

      Now, perform the following:  
      1. **List all matching keywords** (skills, technologies, tools).  
      2. **List missing keywords** that should be added.  
      3. **Calculate ATS Score (%)** based on keyword matching.  
      4. **Give improvement suggestions** in bullet points (-1, -2).  
      5. **Summarize the resume** in under 100 words.

      Important rules:
      - **Strict keyword matching** for accurate ATS score.
      - **No unnecessary sentences**; only structured output.
      - **Format output cleanly with new lines for readability.**
      - **No extra special characters apart from (",", ".", "-").**
    `;

    const response = await getGeminiResponse(inputPrompt);
    res.json({ response });

  } catch (error) {
    console.error("Error processing resume:", error);
    res.status(500).json({ error: "Failed to analyze resume" });

  } finally {
    fs.unlink(resumePath, (err) => {
      if (err) console.error("Error deleting file:", err);
    });
  }
});

db.connect((err) => {
  if (err) {
    console.error("Database connection error:", err);
  } else {
    console.log("Connected to database");
  }
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'this12session#',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 600000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
}));

app.post('/signup', async (req, res) => {
  try {
    const result = await userHelper.DoSignup(req.body);
    res.status(201).json({ success: true, message: "Registration Successful", userId: result.InsertedId });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    const response = await userHelper.DoLogIn(req.body);
    if (response.status) {
      req.session.loggedIn = true;
      req.session.user = response.user;
      res.json({ success: true, user: response.user });
    } else {
      res.json({ success: false, message: "Incorrect email or password" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
