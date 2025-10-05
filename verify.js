// verify.js

// const fetch = (...args) => import("node-fetch").then(({default: fetch}) => fetch(...args));

// // const secret = process.env.JWT_SECRET; // make sure this is defined
// if (!secret) {
//   console.error("❌ JWT_SECRET is missing. Check your .env file!");
//   process.exit(1);
// }


// const fetch = require("node-fetch");
// const jwt = require("jsonwebtoken");

// const API = "http://localhost:4000";
// const email = "khushil04@gmail.com";
// const password = "123456";
// const secret = process.env.JWT_SECRET; // must match backend

require("dotenv").config();
const jwt = require("jsonwebtoken");
 const API = "http://localhost:4000";
const email = "khushil04@gmail.com";
const password = "123456";
const secret = process.env.JWT_SECRET; // ✅ only once

if (!secret) {
  console.error("❌ JWT_SECRET is missing. Did you set it in .env?");
  process.exit(1);
}



(async () => {
  try {
    // 1. Login
    const res = await fetch(`${API}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    const token = data.token;
    console.log("Got token:", token);

    // 2. Verify locally
    const decoded = jwt.verify(token, secret);
    console.log("✅ Token valid:", decoded);

    // 3. Call tickets with token
    const ticketsRes = await fetch(`${API}/api/tickets`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const tickets = await ticketsRes.json();
    console.log("Tickets:", tickets);
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
})();

// const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjMwZGEwYjk5LWQ5ZGEtNDdjZi05YTA0LWNiY2IyZWI4MmJiZiIsInJvbGUiOiJ1c2VyIiwiZW1haWwiOiJraHVzaGlsMDRAZ21haWwuY29tIiwiaWF0IjoxNzU5NjczOTMzLCJleHAiOjE3NTk3MDI3MzN9.KTxYaAwtYFNTkXhGh-c7ErYr0jY5P5jsUkGOJ_1SzUA";