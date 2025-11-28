import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseUrl = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";
const files = [
    "tiny_face_detector_model-weights_manifest.json",
    "tiny_face_detector_model-shard1",
    "face_landmark_68_model-weights_manifest.json",
    "face_landmark_68_model-shard1",
    "age_gender_model-weights_manifest.json",
    "age_gender_model-shard1"
];

const modelsDir = path.join(__dirname, 'public', 'models');

if (!fs.existsSync(modelsDir)){
    fs.mkdirSync(modelsDir, { recursive: true });
}

const downloadFile = (filename) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(path.join(modelsDir, filename));
        https.get(`${baseUrl}/${filename}`, function(response) {
            response.pipe(file);
            file.on('finish', function() {
                file.close(() => {
                    console.log(`Downloaded ${filename}`);
                    resolve();
                });
            });
        }).on('error', function(err) {
            fs.unlink(path.join(modelsDir, filename), () => {}); // Delete the file async. (But we don't check the result)
            reject(err.message);
        });
    });
};

async function downloadAll() {
    console.log("Starting download of face-api models...");
    for (const file of files) {
        try {
            await downloadFile(file);
        } catch (error) {
            console.error(`Error downloading ${file}:`, error);
        }
    }
    console.log("All downloads finished.");
}

downloadAll();
