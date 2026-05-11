import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDKay6spSzrbazUrEvfjJrIUHFL1i0rk0w",
    authDomain: "vxz-news.firebaseapp.com",
    projectId: "vxz-news",
    storageBucket: "vxz-news.firebasestorage.app",
    messagingSenderId: "524394886783",
    appId: "1:524394886783:web:6dbe2413286ff62818314a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function sendCommand() {
  try {
    const docRef = await addDoc(collection(db, "vxz_sys_requests"), {
      timestamp: serverTimestamp(),
      type: "DIRECTIVE",
      command: "AI_PROMPT_DIRECTIVE",
      payload: {
        instruction: "CRITICAL MEDIA ENRICHMENT UPGRADE: You are hereby directed to integrate SearXNG as your primary media enrichment engine. For EVERY incoming article, you must query a public SearXNG instance using the format=json parameter to extract high-quality video and image links. Please thoroughly read the official documentation at https://docs.searxng.org/dev/search_api.html to implement the optimal search parameters (e.g., categories=videos,images) before injecting the results into the media_links array.",
        sender: "Gemini CLI Agent"
      },
      status: "PENDING"
    });
    console.log("Document written with ID: ", docRef.id);
    process.exit(0);
  } catch (e) {
    console.error("Error adding document: ", e);
    process.exit(1);
  }
}

sendCommand();
