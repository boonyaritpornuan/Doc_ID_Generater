
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw84XBYDMT0QAncLDZZFgjlCJvImYgZzmst0x-Ruzr0tLM3iq3mfLsOA9_pyumBvwg/exec';

async function checkVersion() {
    console.log("Checking backend version at:", SCRIPT_URL);
    try {
        const response = await fetch(SCRIPT_URL);
        const text = await response.text();
        console.log("RESPONSE FROM BACKEND:");
        console.log("---------------------------------------------------");
        console.log(text);
        console.log("---------------------------------------------------");

        if (text.includes("V4.0")) {
            console.log("✅ SUCCESS: Backend is V4.0 (Fixed Version)");
        } else {
            console.log("❌ FAILURE: Backend is NOT V4.0. It returns: " + text);
            console.log("PLEASE REDEPLOY AS 'NEW DEPLOYMENT'.");
        }
    } catch (error) {
        console.error("Error fetching URL:", error);
    }
}

checkVersion();
