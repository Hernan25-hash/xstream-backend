// backend/server.js
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "./secrets/.env") });

const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const generateSEO = require("./seoGenerator"); // ✅ Ensure seoGenerator.js exists in backend/
const app = express();

app.use(express.json());
app.use(cors()); // Allow requests from frontend

// ==========================
// ✅ Initialize Firebase Admin SDK (via .env)
// ==========================
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ==========================
// ✅ Endpoint: Generate SEO for all videos
// ==========================
app.get("/generate-seo", async (req, res) => {
  try {
    const videosSnap = await db.collection("videos").get();
    const results = [];

    for (let doc of videosSnap.docs) {
      const videoData = doc.data();
      const seoData = generateSEO(videoData); // Generate title, description, keywords

      await db.collection("videos").doc(doc.id).set(
        { seo: seoData },
        { merge: true }
      );

      results.push({ id: doc.id, seo: seoData });
    }

    res.json({ success: true, updated: results.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================
// ✅ Endpoint: Get SEO for a single video
// ==========================
app.get("/seo/:videoId", async (req, res) => {
  try {
    const { videoId } = req.params;
    const docRef = db.collection("videos").doc(videoId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ success: false, error: "Video not found" });
    }

    let videoData = docSnap.data();

    // Generate SEO if not exists
    if (!videoData.seo) {
      const seoData = generateSEO(videoData);
      await docRef.set({ seo: seoData }, { merge: true });
      videoData.seo = seoData;
    }

    res.json({ success: true, seo: videoData.seo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================
// ✅ Optional: Generate SEO for the entire site
// ==========================
app.get("/generate-full-seo", async (req, res) => {
  try {
    const videosSnap = await db.collection("videos").get();
    const allVideoData = videosSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const seoPages = [];

    // Homepage
    const homepageSEO = generateSEO({ videos: allVideoData, page: "homepage" });
    seoPages.push({ path: "/", seo: homepageSEO });

    // Categories
    const categories = [...new Set(allVideoData.map(v => v.category).filter(Boolean))];
    categories.forEach((cat) => {
      const catVideos = allVideoData.filter(v => v.category === cat);
      const catSEO = generateSEO({ videos: catVideos, category: cat });
      seoPages.push({ path: `/category/${cat}`, seo: catSEO });
    });

    // Individual videos
    for (let video of allVideoData) {
      const videoSEO = generateSEO(video);
      await db.collection("videos").doc(video.id).set({ seo: videoSEO }, { merge: true });
      seoPages.push({ path: `/embed/${video.id}`, seo: videoSEO });
    }

    res.json({ success: true, pages: seoPages.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================
// ✅ Health check
// ==========================
app.get("/", (req, res) => {
  res.send({ success: true, message: "SEO backend is running securely" });
});

// ==========================
// ✅ Start server
// ==========================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`✅ SEO backend running securely on http://localhost:${PORT}`)
);
